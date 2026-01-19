import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const fieldTypes = ["text", "textarea", "number", "date", "select", "checkbox"];

const DocTemplateBuilderModal = ({
  open,
  mode,
  initial,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [local, setLocal] = useState({
    name: "",
    enabled: true,
    sections: [],
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setLocal({
        name: initial.name || "",
        enabled: !!initial.enabled,
        sections: JSON.parse(JSON.stringify(initial.sections || [])),
      });
    } else {
      setLocal({ name: "", enabled: true, sections: [] });
    }
  }, [open, mode, initial]);

  const canSave = useMemo(() => local.name.trim().length > 0, [local.name]);

  const addSection = () => {
    setLocal((p) => ({
      ...p,
      sections: [...p.sections, { id: `SEC-${Date.now()}`, title: "New Section", fields: [] }],
    }));
  };

  const updateSection = (sectionId, patch) => {
    setLocal((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    }));
  };

  const deleteSection = (sectionId) => {
    setLocal((p) => ({
      ...p,
      sections: p.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const addField = (sectionId) => {
    setLocal((p) => ({
      ...p,
      sections: p.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          fields: [
            ...s.fields,
            { id: `F-${Date.now()}-${Math.random().toString(16).slice(2)}`, label: "New Field", type: "text", required: false, options: [] },
          ],
        };
      }),
    }));
  };

  const updateField = (sectionId, fieldId, patch) => {
    setLocal((p) => ({
      ...p,
      sections: p.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
        };
      }),
    }));
  };

  const deleteField = (sectionId, fieldId) => {
    setLocal((p) => ({
      ...p,
      sections: p.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, fields: s.fields.filter((f) => f.id !== fieldId) };
      }),
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === "edit" ? "Edit Documentation Template" : "Add Documentation Template"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Form builder-lite — sections + fields
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
              disabled={!canSave}
              onClick={() => {
                const payload = {
                  name: local.name.trim(),
                  enabled: !!local.enabled,
                  sections: local.sections.map((s) => ({
                    ...s,
                    title: (s.title || "").trim(),
                    fields: (s.fields || []).map((f) => ({
                      ...f,
                      label: (f.label || "").trim(),
                      type: f.type,
                      required: !!f.required,
                      options: f.type === "select" ? (f.options || []) : [],
                    })),
                  })),
                };

                if (mode === "edit" && initial) onUpdate(initial.id, payload);
                else onCreate(payload);

                onClose();
              }}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Field label="Template Name">
              <input className={inputClass} value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} />
            </Field>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={local.enabled}
                onChange={(e) => setLocal({ ...local, enabled: e.target.checked })}
              />
              <p className="text-sm text-gray-700 font-medium">Enabled</p>
            </div>

            <div className="lg:justify-end flex items-center mt-6">
              <Button variant="outline" className="rounded-xl" onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </div>

          {/* Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {local.sections.length === 0 ? (
              <div className="lg:col-span-2 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
                No sections yet. Click <span className="font-semibold text-gray-900">Add Section</span> to start.
              </div>
            ) : (
              local.sections.map((s) => (
                <div key={s.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Section Title</p>
                      <input
                        className={inputClass}
                        value={s.title}
                        onChange={(e) => updateSection(s.id, { title: e.target.value })}
                      />
                    </div>

                    <Button variant="outline" className="rounded-xl mt-6" onClick={() => deleteSection(s.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Fields</p>
                    <Button variant="outline" className="rounded-xl" onClick={() => addField(s.id)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {(s.fields || []).length === 0 ? (
                      <p className="text-sm text-gray-500">No fields yet.</p>
                    ) : (
                      s.fields.map((f) => (
                        <div key={f.id} className="rounded-2xl bg-gray-50 p-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold text-gray-600 mb-1">Label</p>
                              <input
                                className={inputClass}
                                value={f.label}
                                onChange={(e) => updateField(s.id, f.id, { label: e.target.value })}
                              />
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Type</p>
                              <select
                                className={inputClass}
                                value={f.type}
                                onChange={(e) => updateField(s.id, f.id, { type: e.target.value })}
                              >
                                {fieldTypes.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={!!f.required}
                                onChange={(e) => updateField(s.id, f.id, { required: e.target.checked })}
                              />
                              Required
                            </label>

                            <Button variant="outline" className="rounded-xl" onClick={() => deleteField(s.id, f.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Field
                            </Button>
                          </div>

                          {f.type === "select" ? (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-600 mb-1">
                                Options (comma separated)
                              </p>
                              <input
                                className={inputClass}
                                value={(f.options || []).join(", ")}
                                onChange={(e) =>
                                  updateField(s.id, f.id, {
                                    options: e.target.value
                                      .split(",")
                                      .map((x) => x.trim())
                                      .filter(Boolean),
                                  })
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

export default DocTemplateBuilderModal;