import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUserStore } from "@/store/userStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Shared logout-confirmation flow for every dashboard sidebar. Returns
// `requestLogout` (use as the nav item's onClick) and the dialog to render.
export function useLogoutConfirm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  const requestLogout = () => setOpen(true);

  const confirmLogout = () => {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  const LogoutConfirmDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("session.logoutConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("session.logoutConfirmBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("session.cancel")}
          </Button>
          <Button variant="destructive" onClick={confirmLogout}>
            {t("session.logoutConfirmAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { requestLogout, LogoutConfirmDialog };
}
