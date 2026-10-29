import { Avatar } from "./Avatar";
import { doctorPortrait } from "../utils/visuals";

export function DoctorAvatar({
  name,
  size = "md",
  shape = "circle",
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  shape?: "circle" | "rounded";
}) {
  return <Avatar name={name} src={doctorPortrait(name)} size={size} shape={shape} />;
}
