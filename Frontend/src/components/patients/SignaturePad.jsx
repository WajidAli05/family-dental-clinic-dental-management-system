import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

/**
 * Draw-to-sign canvas. Plain 2D canvas and pointer events — no library.
 *
 * Precedent: lib/imageThumb.js already downscales images in the browser with a
 * canvas, so the toolchain for "produce a PNG client-side" exists. A signature
 * pad is strictly simpler than that, so a dependency would buy nothing.
 *
 * `onChange(dataUrl | null)` fires whenever the drawing changes, so the parent
 * can enable/disable submit without reaching into the canvas.
 */
const SignaturePad = ({ onChange, disabled = false, height = 160 }) => {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // Size the backing store to the displayed size so strokes are not blurry on
  // HiDPI screens, and give it an opaque white ground (a transparent PNG would
  // render as a black box once drawn into the PDF).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, height);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, [height]);

  const pointAt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    if (disabled) return;
    drawing.current = true;
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const { x, y } = pointAt(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current || disabled) return;
    const { x, y } = pointAt(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange?.(hasInk ? canvasRef.current.toDataURL("image/png") : null);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, height);
    setHasInk(false);
    onChange?.(null);
  };

  // A finished stroke must publish even when `hasInk` only just flipped.
  useEffect(() => {
    if (hasInk && !drawing.current && canvasRef.current) {
      onChange?.(canvasRef.current.toDataURL("image/png"));
    }
  }, [hasInk]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: "none" }}
        className={`w-full rounded-lg border-2 border-dashed ${
          disabled ? "border-gray-200 opacity-60" : "border-gray-300 cursor-crosshair"
        }`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">{t("consent.signHint")}</p>
        <Button type="button" size="sm" variant="outline" onClick={clear} disabled={disabled || !hasInk}>
          <Eraser className="h-3.5 w-3.5 me-1" />
          {t("consent.clearSignature")}
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
