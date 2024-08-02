import dayjs from "dayjs";

export default function isEmailExpired(date?: Date | string) {
  if (!date) return false;
  return dayjs(date).add(1, "year").isBefore(new Date());
}
