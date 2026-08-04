import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUserStore } from "@/store/userStore";
import { useIdleTimeout, IDLE_WARNING_MS } from "@/hooks/useIdleTimeout";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const WARNING_MINUTES = Math.round(IDLE_WARNING_MS / 60000);

// Mounted once per authenticated role tree (inside ProtectedRoute). Warns at
// 18 minutes idle, auto-logs-out at 20 if the user never responds.
export default function IdleTimeoutGuard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);
  const [warnOpen, setWarnOpen] = useState(false);

  const handleWarn = useCallback(() => setWarnOpen(true), []);

  const handleTimeout = useCallback(() => {
    setWarnOpen(false);
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const { stayActive } = useIdleTimeout({ enabled: true, onWarn: handleWarn, onTimeout: handleTimeout });

  const handleStaySignedIn = () => {
    setWarnOpen(false);
    stayActive();
  };

  return (
    <Dialog open={warnOpen} onOpenChange={(open) => { if (!open) handleStaySignedIn(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("session.idleWarningTitle")}</DialogTitle>
          <DialogDescription>
            {t("session.idleWarningBody", { minutes: WARNING_MINUTES })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            className="bg-[#2ec4b6] hover:bg-[#26b0a3] text-white"
            onClick={handleStaySignedIn}
          >
            {t("session.staySignedIn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
