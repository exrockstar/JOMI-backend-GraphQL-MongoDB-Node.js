export function ipv4ToLong(ip: string = "") {
  return ip.split(".").reduce((t, n) => t * 256 + parseInt(n), 0);
}

export function longToIP(long: number) {
  var part1 = long & 255;
  var part2 = (long >> 8) & 255;
  var part3 = (long >> 16) & 255;
  var part4 = (long >> 24) & 255;

  return part4 + "." + part3 + "." + part2 + "." + part1;
}
