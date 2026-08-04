/**
 * LoginActivityCard
 *
 * Drop-in card for any profile/security page. Surfaces the current user's
 * own login history (existing User.loginHistory — last 20 entries) and a
 * "Log out of all devices" action that revokes every issued JWT.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { History, LogOut, CheckCircle2, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { sessionApi } from "@/lib/sessionApi";
import { useUserStore } from "@/store/userStore";

export default function LoginActivityCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const json = await sessionApi.getLoginHistory();
      setHistory(json.data || []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleLogoutAll = async () => {
    setRevoking(true);
    try {
      await sessionApi.logoutAllDevices();
      setConfirmOpen(false);
      toast.success(t("security.logoutAllSuccess"));
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err.message || t("security.logoutAllError"));
      setRevoking(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#2ec4b6]" />
            <h3 className="text-base font-semibold text-gray-900">
              {t("security.loginHistoryTitle")}
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => setConfirmOpen(true)}
          >
            <LogOut className="w-3.5 h-3.5 me-1.5" />
            {t("security.logoutAllBtn")}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">{t("security.loadingHistory")}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-400">{t("security.noLoginHistory")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("security.colTime")}</TableHead>
                  <TableHead>{t("security.colIp")}</TableHead>
                  <TableHead>{t("security.colDevice")}</TableHead>
                  <TableHead>{t("security.colStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm text-gray-600">
                      {h.at ? new Date(h.at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{h.ip || "—"}</TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-[240px] truncate">{h.ua || "—"}</TableCell>
                    <TableCell>
                      {h.success ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t("security.statusSuccess")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <XCircle className="w-3.5 h-3.5" /> {t("security.statusFailed")}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("security.logoutAllConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("security.logoutAllConfirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={revoking}>
              {t("session.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleLogoutAll} disabled={revoking}>
              {revoking ? t("security.loggingOutAll") : t("security.logoutAllBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
