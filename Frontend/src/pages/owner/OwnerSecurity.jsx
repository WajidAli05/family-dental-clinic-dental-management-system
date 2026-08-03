import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSecurityStore } from "@/store/securityStore";
import OwnerPageHeader from "@/components/owner/OwnerPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldAlert, LockOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ROLE_COLOR = {
  owner:        "bg-purple-100 text-purple-800",
  receptionist: "bg-blue-100 text-blue-800",
  dentist:      "bg-green-100 text-green-800",
  lab:          "bg-orange-100 text-orange-800",
};

export default function OwnerSecurity() {
  const { t } = useTranslation();
  const { lockedAccounts, loading, error, fetchLockedAccounts, unlock } = useSecurityStore();
  const [unlocking, setUnlocking] = useState(null); // userId being unlocked

  useEffect(() => {
    fetchLockedAccounts();
    // Refresh every 30 s so the list stays current
    const id = setInterval(fetchLockedAccounts, 30_000);
    return () => clearInterval(id);
  }, [fetchLockedAccounts]);

  const handleUnlock = async (userId, email) => {
    setUnlocking(userId);
    try {
      await unlock(userId);
      toast.success(t("security.unlockSuccess", { email }));
    } catch (err) {
      toast.error(err.message || t("security.unlockError"));
    } finally {
      setUnlocking(null);
    }
  };

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title={t("security.title")}
        subtitle={t("security.subtitle")}
      />

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-semibold">
                {t("security.lockedAccountsTitle")}
              </h2>
              {lockedAccounts.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  {lockedAccounts.length}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLockedAccounts}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className={`w-4 h-4 me-1 ${loading ? "animate-spin" : ""}`} />
              {t("security.refresh")}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}

          {!loading && lockedAccounts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              <LockOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              {t("security.noLockedAccounts")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("security.colName")}</TableHead>
                    <TableHead>{t("security.colEmail")}</TableHead>
                    <TableHead>{t("security.colRole")}</TableHead>
                    <TableHead>{t("security.colAttempts")}</TableHead>
                    <TableHead>{t("security.colUnlockIn")}</TableHead>
                    <TableHead className="text-end">{t("security.colAction")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lockedAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{acc.email}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ROLE_COLOR[acc.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {acc.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-red-600 font-medium">
                        {acc.failedLoginAttempts}
                      </TableCell>
                      <TableCell className="text-sm text-orange-600">
                        {acc.minutesLeft} {t("security.minutes")}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-[#2ec4b6] text-[#2ec4b6] hover:bg-[#e6f9f7]"
                          disabled={unlocking === acc.id}
                          onClick={() => handleUnlock(acc.id, acc.email)}
                        >
                          <LockOpen className="w-3 h-3 me-1" />
                          {unlocking === acc.id
                            ? t("security.unlocking")
                            : t("security.unlockBtn")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4">
            {t("security.autoRefreshNote")}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-base font-semibold mb-2">{t("security.policyTitle")}</h2>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>{t("security.policy1")}</li>
            <li>{t("security.policy2")}</li>
            <li>{t("security.policy3")}</li>
            <li>{t("security.policy4")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
