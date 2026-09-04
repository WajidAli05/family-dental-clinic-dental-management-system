import React, { useState, useEffect, useCallback } from "react";
import { usePatientStore } from "@/store/patientStore";

import PatientStats from "@/components/receptionist/PatientStats";
import PatientSearch from "@/components/receptionist/PatientSearch";
import PatientTable from "@/components/receptionist/PatientTable";
import AddPatientModal from "@/components/receptionist/AddPatientModal";
import EditPatientModal from "@/components/receptionist/EditPatientModal";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Wavify from "react-wavify";

import TablePagination from "@/components/ui/TablePagination";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { usePagination } from "@/hooks/usePagination";
import { useTableSort } from "@/hooks/useTableSort";

const Patients = () => {
  const {
    patients,
    stats,
    loading,
    error,
    pagination,
    fetchPatients,
    fetchPatientStats,
  } = usePatientStore();

  const { page, limit, setPage, resetPage } = usePagination(50);
  const { sortBy, sortDir } = useTableSort("registrationDate", "desc");

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  const load = useCallback(() => {
    if (typeof fetchPatients === "function") {
      fetchPatients({ q: searchQuery, page, limit, sortBy, sortDir });
    }
  }, [fetchPatients, searchQuery, page, limit, sortBy, sortDir]);

  useEffect(() => {
    load();
    if (typeof fetchPatientStats === "function") fetchPatientStats();
  }, [load, fetchPatientStats]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    resetPage();
  };

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 4 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500">View and manage registered patients</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>
      ) : null}

      <PatientStats patients={patients} stats={stats} />

      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Patient Directory</h2>
            <div className="flex gap-3 items-center">
              <PatientSearch onSearch={handleSearch} />
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#2ec4b6] hover:bg-[#26a699] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Patient
              </Button>
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : (
            <PatientTable
              patients={patients || []}
              onView={(patient) => setEditingPatient(patient)}
              onEdit={(patient) => setEditingPatient(patient)}
            />
          )}

          <TablePagination
            page={pagination?.page ?? page}
            pages={pagination?.pages ?? 1}
            total={pagination?.total ?? 0}
            limit={limit}
            onPage={setPage}
          />
        </CardContent>
      </Card>

      <AddPatientModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      <EditPatientModal
        open={!!editingPatient}
        onOpenChange={(open) => { if (!open) setEditingPatient(null); }}
        patient={editingPatient}
      />
    </div>
  );
};

export default Patients;
