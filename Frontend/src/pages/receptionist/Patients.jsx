import React, { useState } from "react"; 

// Store
import { usePatientStore } from "@/store/patientStore";

// Components
import PatientStats from "@/components/receptionist/PatientStats";
import PatientSearch from "@/components/receptionist/PatientSearch";
import PatientTable from "@/components/receptionist/PatientTable";
import { Card, CardContent } from "@/components/ui/card";

// Waves
import Wavify from "react-wavify";

const Patients = () => {
  const { patients } = usePatientStore();
  const [filteredPatients, setFilteredPatients] = useState(patients);

  const handleSearch = (query) => {
    if (!query) {
      setFilteredPatients(patients);
    } else {
      setFilteredPatients(
        patients.filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
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
            <PatientSearch onSearch={handleSearch} />
          </div>

          <PatientTable patients={filteredPatients} />
        </CardContent>
      </Card>

    </div>
  );
};

export default Patients;