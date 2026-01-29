export const cities = [
  "Rawalpindi",
  "Islamabad",
  "Taxila",
  "Wah Cantt",
  "Gujar Khan",
];

export const firstNames = [
  "Ali",
  "Sara",
  "Hina",
  "Ayesha",
  "Hamza",
  "Bilal",
  "Zainab",
  "Farhan",
  "Maryam",
  "Usman",
  "Saad",
  "Noor",
  "Ibrahim",
  "Komal",
  "Nida",
];

export const lastNames = [
  "Khan",
  "Raza",
  "Malik",
  "Ahmed",
  "Qureshi",
  "Tariq",
  "Sheikh",
  "Iqbal",
  "Hassan",
  "Noor",
];

export const sampleTypeNames = [
  { name: "Crown", desc: "Single crown case" },
  { name: "Bridge", desc: "Bridge prosthesis" },
  { name: "Impression", desc: "Alginate/silicone impression" },
  { name: "Denture", desc: "Complete/partial denture" },
  { name: "Zirconia Crown", desc: "Zirconia crown fabrication" },
  { name: "E-Max Veneer", desc: "E-Max veneer case" },
  { name: "Implant Abutment", desc: "Implant abutment work" },
  { name: "Night Guard", desc: "Occlusal guard appliance" },
  { name: "Retainer", desc: "Ortho retainer" },
  { name: "Wax Try-In", desc: "Wax try-in stage work" },
];

/**
 * ✅ Labs (10)
 * - Keep password here so seed.js can hash & setPassword()
 */
export const labProfiles = [
  {
    publicId: "LAB-USER-1",
    name: "Dental Lab Rawalpindi",
    email: "lab.rwp@example.com",
    password: "lab123",
    phone: "051-5551234",
    address: "Saddar, Rawalpindi",
    specialization: "Prosthetics",
    experience: "8 years",
    bio: "High quality lab work with CAD/CAM support.",
    certifications: ["Certified Dental Technician", "CAD/CAM Specialist"],
    workingHours: "9:00 AM - 6:00 PM",
    joinDate: "January 2017",
  },
  {
    publicId: "LAB-USER-2",
    name: "Smile Craft Lab",
    email: "smilecraft@example.com",
    password: "lab123",
    phone: "051-7778899",
    address: "6th Road, Rawalpindi",
    specialization: "Ceramics",
    experience: "6 years",
    bio: "Specialist in zirconia and E-max.",
    certifications: ["Quality Assurance Certified"],
    workingHours: "10:00 AM - 7:00 PM",
    joinDate: "March 2019",
  },
  {
    publicId: "LAB-USER-3",
    name: "Ortho Lab PK",
    email: "ortholab@example.com",
    password: "lab123", // ✅ your lab login credential
    phone: "051-4447766",
    address: "Blue Area, Islamabad",
    specialization: "Orthodontics",
    experience: "10 years",
    bio: "Ortho appliances and retainers.",
    certifications: ["Certified Dental Technician"],
    workingHours: "9:00 AM - 5:00 PM",
    joinDate: "July 2015",
  },
  {
    publicId: "LAB-USER-4",
    name: "Crown Studio Lab",
    email: "crownstudio@example.com",
    password: "lab123",
    phone: "051-2223344",
    address: "Bahria Town, Rawalpindi",
    specialization: "Zirconia",
    experience: "5 years",
    bio: "Premium zirconia crowns and bridges.",
    certifications: ["CAD/CAM Specialist"],
    workingHours: "9:00 AM - 6:00 PM",
    joinDate: "June 2020",
  },
  {
    publicId: "LAB-USER-5",
    name: "Emax Elite Lab",
    email: "emaxelite@example.com",
    password: "lab123",
    phone: "051-3334455",
    address: "PWD, Islamabad",
    specialization: "E-max",
    experience: "7 years",
    bio: "E-max veneers and anterior aesthetics.",
    certifications: ["Certified Dental Technician"],
    workingHours: "10:00 AM - 7:00 PM",
    joinDate: "February 2018",
  },
  {
    publicId: "LAB-USER-6",
    name: "Align Ortho Lab",
    email: "alignortho@example.com",
    password: "lab123",
    phone: "051-1212121",
    address: "G-11, Islamabad",
    specialization: "Orthodontics",
    experience: "9 years",
    bio: "Retainers, aligners, and ortho appliances.",
    certifications: ["Quality Assurance Certified"],
    workingHours: "9:00 AM - 5:00 PM",
    joinDate: "August 2016",
  },
  {
    publicId: "LAB-USER-7",
    name: "Pro Dent Lab",
    email: "prodentlab@example.com",
    password: "lab123",
    phone: "051-5656565",
    address: "Scheme 3, Rawalpindi",
    specialization: "Prosthetics",
    experience: "11 years",
    bio: "Full dentures and partials with precision.",
    certifications: ["Certified Dental Technician"],
    workingHours: "9:00 AM - 6:00 PM",
    joinDate: "May 2014",
  },
  {
    publicId: "LAB-USER-8",
    name: "Nova Dental Lab",
    email: "novalab@example.com",
    password: "lab123",
    phone: "051-7878787",
    address: "F-8, Islamabad",
    specialization: "Ceramics",
    experience: "4 years",
    bio: "Ceramic layering and premium aesthetics.",
    certifications: ["CAD/CAM Specialist"],
    workingHours: "10:00 AM - 7:00 PM",
    joinDate: "January 2021",
  },
  {
    publicId: "LAB-USER-9",
    name: "Precision Lab",
    email: "precisionlab@example.com",
    password: "lab123",
    phone: "051-9090909",
    address: "Satellite Town, Rawalpindi",
    specialization: "CAD/CAM",
    experience: "6 years",
    bio: "Digital workflows and fast turnaround.",
    certifications: ["CAD/CAM Specialist", "Quality Assurance Certified"],
    workingHours: "9:00 AM - 6:00 PM",
    joinDate: "October 2019",
  },
  {
    publicId: "LAB-USER-10",
    name: "BridgeWorks Lab",
    email: "bridgeworks@example.com",
    password: "lab123",
    phone: "051-1010101",
    address: "I-8, Islamabad",
    specialization: "Bridges",
    experience: "12 years",
    bio: "Long-span bridges and implant crowns.",
    certifications: ["Certified Dental Technician"],
    workingHours: "9:00 AM - 6:00 PM",
    joinDate: "September 2013",
  },
];

/**
 * ✅ Dentists (10) - needed for dentist login + dentist dashboard data
 * Use these credentials for testing:
 *   dentist1@fdc.com / dentist123
 *   dentist2@fdc.com / dentist123
 *   ...
 */
export const dentistProfiles = Array.from({ length: 10 }).map((_, i) => {
  const n = i + 1;
  const specializations = [
    "General Dentistry",
    "Orthodontics",
    "Endodontics",
    "Prosthodontics",
    "Periodontics",
  ];

  return {
    publicId: `DENT-${n}`,
    name: `Dr. ${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
    email: `dentist${n}@fdc.com`,
    password: "dentist123",
    phone: `03${(i % 9) + 1}${String(10000000 + i * 12345).slice(0, 8)}`,
    role: "dentist",
    enabled: true,
    specialization: specializations[i % specializations.length],
    available: true,
    commissionPercent: 10 + (i % 4) * 5, // 10/15/20/25
  };
});

/**
 * ✅ Owner + Receptionist (optional but useful for complete auth demo)
 */
export const ownerProfiles = [
  {
    publicId: "OWNER-1",
    name: "Clinic Owner",
    email: "owner@fdc.com",
    password: "owner123",
    phone: "0300-0000000",
    role: "owner",
    enabled: true,
  },
];

export const receptionistProfiles = [
  {
    publicId: "REC-1",
    name: "Reception User",
    email: "receptionist@fdc.com",
    password: "reception123",
    phone: "0301-1111111",
    role: "receptionist",
    enabled: true,
  },
];

/**
 * ✅ Realistic dentist/lab case notes + timeline notes
 * (seed.js can pick these)
 */
export const caseNotes = [
  "",
  "Shade A2",
  "Shade B1",
  "Urgent case - patient traveling",
  "Need better impression, please re-take",
  "Check occlusion before final glazing",
  "Add glaze and polish",
  "Pontic design discussed with dentist",
  "Margin refinement requested",
  "Please match adjacent tooth shade",
];

export const labStatusFlowNotes = {
  sent: ["Case created and sent to lab", "Assigned to technician", "Received impressions"],
  in_progress: ["Wax-up started", "CAD/CAM design in progress", "Ceramic layering started"],
  ready: ["Ready for delivery", "QC passed", "Final polish done"],
  delivered: ["Delivered to clinic", "Awaiting dentist approval"],
  approved: ["Approved by dentist", "Case completed successfully"],
  rejected: ["Rejected: margin issue", "Rejected: shade mismatch", "Rejected: occlusion high"],
};

export const appointmentReasons = [
  "Consultation",
  "Scaling",
  "Follow-up",
  "Tooth Pain",
  "Root Canal Review",
  "Braces Adjustment",
  "Crown Fitting",
  "Extraction Review",
];

export const appointmentTimes = [
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
];