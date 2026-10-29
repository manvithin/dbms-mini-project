export interface DepartmentVisual {
  image: string;
  gradient: string;
  chip: string;
  soft: string;
  text: string;
  ring: string;
}

const departmentVisuals: Record<string, DepartmentVisual> = {
  "General Medicine": {
    image: "/art/departments/general-medicine.svg",
    gradient: "from-brand-500 to-emerald-400",
    chip: "bg-brand-100 text-brand-800",
    soft: "bg-brand-50",
    text: "text-brand-700",
    ring: "ring-brand-100",
  },
  Cardiology: {
    image: "/art/departments/cardiology.svg",
    gradient: "from-rose-500 to-orange-400",
    chip: "bg-rose-100 text-rose-800",
    soft: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-100",
  },
  Paediatrics: {
    image: "/art/departments/paediatrics.svg",
    gradient: "from-amber-400 to-orange-500",
    chip: "bg-amber-100 text-amber-900",
    soft: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-100",
  },
  Orthopaedics: {
    image: "/art/departments/orthopaedics.svg",
    gradient: "from-sky-500 to-blue-600",
    chip: "bg-sky-100 text-sky-800",
    soft: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-100",
  },
  Dermatology: {
    image: "/art/departments/dermatology.svg",
    gradient: "from-violet-500 to-purple-600",
    chip: "bg-violet-100 text-violet-800",
    soft: "bg-violet-50",
    text: "text-violet-700",
    ring: "ring-violet-100",
  },
  "Ear Nose and Throat": {
    image: "/art/departments/ear-nose-throat.svg",
    gradient: "from-cyan-500 to-teal-600",
    chip: "bg-cyan-100 text-cyan-800",
    soft: "bg-cyan-50",
    text: "text-cyan-700",
    ring: "ring-cyan-100",
  },
};

const fallbackDepartment: DepartmentVisual = {
  image: "/art/departments/default.svg",
  gradient: "from-brand-500 to-teal-600",
  chip: "bg-brand-100 text-brand-800",
  soft: "bg-brand-50",
  text: "text-brand-700",
  ring: "ring-brand-100",
};

export function departmentVisual(name?: string | null): DepartmentVisual {
  if (name && departmentVisuals[name]) return departmentVisuals[name];
  return fallbackDepartment;
}

const doctorPortraits: Record<string, string> = {
  "Dr. Meera Iyer": "/art/doctors/meera-iyer.svg",
  "Dr. Rohan Das": "/art/doctors/rohan-das.svg",
  "Dr. Ananya Rao": "/art/doctors/ananya-rao.svg",
  "Dr. Kabir Singh": "/art/doctors/kabir-singh.svg",
  "Dr. Neha Kulkarni": "/art/doctors/neha-kulkarni.svg",
  "Dr. Vikram Menon": "/art/doctors/vikram-menon.svg",
};

export function doctorPortrait(name?: string | null): string | undefined {
  if (!name) return undefined;
  return doctorPortraits[name];
}
