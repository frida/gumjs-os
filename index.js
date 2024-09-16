function sysinfo() {
  const struct = Memory.alloc(128);
  if (new NativeFunction(Module.getExportByName(null, "sysinfo"), "int", ["pointer"])(struct) === 0) {
    const uptime = struct.readLong();
    const totalram = struct.add(Process.pointerSize * 4).readULong(); // long should be equal to pointer size
    const freeram = struct.add(Process.pointerSize * 5).readULong();
    return [uptime, totalram, freeram];
  }
  return [undefined, undefined, undefined];
}

function globalMemoryStatus() {
  const struct = Memory.alloc(64);
  struct.writeU32(64);
  if (new NativeFunction(Module.getExportByName("kernel32.dll", "GlobalMemoryStatusEx"), "int", ["pointer"])(struct)) {
    const totalPhys = struct.add(8).readULong();
    const availPhys = struct.add(16).readULong();
    return [totalPhys, availPhys];
  }
  return [undefined, undefined];
}

export function endianness() {
  const buf = Memory.alloc(4);
  buf.writeU32(1);
  return buf.readU8() === 1 ? "LE" : "BE";
}

export function hostname() {
  switch (Process.platform) {
    case "windows":
    case "linux":
      const limit = Process.platform === "linux" ? 256 : 16;
      const buffer = Memory.alloc(limit);
      if (new NativeFunction(Module.getExportByName(null, "gethostname"), "int", ["pointer", "int"])(buffer, limit) === 0) return buffer.readUtf8String() ?? "";
      else return "";
    case "darwin":
    case "freebsd":
    case "qnx":
    case "barebone":
      return "";
  }
}

export function loadavg() {
  switch (Process.platform) {
    case "linux":
      const buffer = Memory.alloc(3 * 8);
      if (new NativeFunction(Module.getExportByName(null, "getloadavg"), "int", ["pointer", "int"])(buffer, 3) === 3)
        return [buffer.readDouble(), buffer.add(8).readDouble(), buffer.add(16).readDouble()];
      return [0, 0, 0];
    case "freebsd":
    case "qnx":
    case "barebone":
    case "windows": // Windows doesn't support loadavg
    case "darwin":
      return [0, 0, 0];
  }
}

export function uptime() {
  switch (Process.platform) {
    case "linux":
      return sysinfo()[0] ?? 0;
    case "windows":
      return new NativeFunction(Module.getExportByName(null, "GetTickCount64"), "uint64", [])() / 1000;
    case "freebsd":
    case "qnx":
    case "barebone":
    case "darwin":
      return 0;
  }
}

export function freemem() {
  switch (Process.platform) {
    case "linux":
      return sysinfo()[2] ?? Number.MAX_VALUE;
    case "windows":
      return globalMemoryStatus()[1] ?? Number.MAX_VALUE;
    case "darwin":
    case "freebsd":
    case "qnx":
    case "barebone":
      return Number.MAX_VALUE;
  }
}

export function totalmem() {
  switch (Process.platform) {
    case "linux":
      return sysinfo()[1] ?? Number.MAX_VALUE;
    case "windows":
      return globalMemoryStatus()[0] ?? Number.MAX_VALUE;
    case "freebsd":
    case "qnx":
    case "barebone":
    case "darwin":
      return 0;
  }
}

export function cpus() {
  return [];
}

export function type() {
  const p = Process.platform;
  if (p === "windows") return "Windows_NT";
  return p[0].toUpperCase() + p.substr(1);
}

export function release() {
  switch (Process.platform) {
    case "linux":
      const struct = Memory.alloc(512);
      if (new NativeFunction(Module.getExportByName(null, "uname"), "int", ["pointer"])(struct) === 0) {
        const offsets = [9, 33, 65, 257];
        let hostnameOffset = 0;

        for (const offset of offsets) {
          const str = struct.add(offset).readCString();
          if (str) {
            hostnameOffset = offset;
            break;
          }
        }
        return struct.add(hostnameOffset * 2).readCString() ?? "";
      }
      return "";
    case "windows":
    case "freebsd":
    case "qnx":
    case "barebone":
    case "darwin":
      return "";
  }
}

export function networkInterfaces() {
  return {};
}

export function getNetworkInterfaces() {
  return {};
}

export function arch() {
  return Process.arch;
}

export function platform() {
  const p = Process.platform;
  if (p === "windows") return "win32";
  return p;
}

export function tmpdir() {
  return Process.getTmpDir();
}

export const EOL = Process.platform === "windows" ? "\r\n" : "\n";

export function homedir() {
  return Process.getHomeDir();
}

export default {
  endianness,
  hostname,
  loadavg,
  uptime,
  freemem,
  totalmem,
  cpus,
  type,
  release,
  networkInterfaces,
  getNetworkInterfaces,
  arch,
  platform,
  tmpdir,
  EOL,
  homedir
};
