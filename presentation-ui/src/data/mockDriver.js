export const DRIVER = {
  profile: {
    driverId: "D101",
    name: "สมชาย",
    vehicle: "Hello Taxi",
    plate: "9กก 9867",
    plateNumber: "9กก 9867",
    status: "Online",
    score: "94.2% ready",
  },
  queue: {
    position: 8,
    waitMin: 12,
  },
  incentive: "+THB 50 per trip during the current airport arrival wave.",
  forecastBars: [
    { time: "14:00", height: 36, type: "normal", label: "" },
    { time: "16:00", height: 52, type: "normal", label: "" },
    { time: "18:00", height: 80, type: "surge", label: "Surge" },
    { time: "20:00", height: 96, type: "peak", label: "Peak" },
    { time: "22:00", height: 58, type: "normal", label: "" },
    { time: "00:00", height: 30, type: "normal", label: "" },
  ],
};

export const DEFAULT_CREDENTIALS = {
  username: "driver_demo",
  password: "1234",
  driverId: "D101",
};
