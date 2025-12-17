import React, { useState, useEffect } from "react"; 
// Store
import { usePatientStore } from "@/store/patientStore";
// Components
import PatientStats from "@/components/receptionist/PatientStats";
import PatientSearch from "@/components/receptionist/PatientSearch";
import PatientTable from "@/components/receptionist/PatientTable";
import AddPatientModal from "@/components/receptionist/AddPatientModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
// Waves
import Wavify from "react-wavify";

const Patients = () => {
  const { patients, searchPatients, getStats } = usePatientStore();
  const [filteredPatients, setFilteredPatients] = useState(patients);
  const [stats, setStats] = useState(getStats());
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setFilteredPatients(patients);
    setStats(getStats());
  }, [patients, getStats]);

  const handleSearch = (query) => {
    const results = searchPatients(query);
    setFilteredPatients(results);
  };

  const handleAddPatient = () => {
    setIsModalOpen(true);
  };


  return (
    <div className="w-full space-y-8">
      {/* Header with Waves */}
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{
            height: 20,
            amplitude: 30,
            speed: 0.15,
            points: 4
          }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500">
            View and manage registered patients
          </p>
        </div>
      </div>

      {/* Stats */}
      <PatientStats patients={patients} />

      {/* Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Patient Directory</h2>
            <div className="flex gap-3 items-center">
              <PatientSearch onSearch={handleSearch} />
              <Button 
                onClick={handleAddPatient}
                className="bg-[#2ec4b6] hover:bg-[#26a699] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Patient
              </Button>
            </div>
          </div>
          <PatientTable patients={filteredPatients} />
        </CardContent>
      </Card>

      {/* Add Patient Modal */}
      <AddPatientModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};

export default Patients;