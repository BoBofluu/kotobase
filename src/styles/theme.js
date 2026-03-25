const BASE_BTN = [
  "border border-[#818cf8] text-[#818cf8] rounded-full transition-all focus:outline-none",
  "flex items-center justify-center font-bold",
  "hover:bg-[#818cf8] hover:text-white hover:shadow-[0_0_12px_rgba(129,140,248,0.35)]",
  "active:scale-95 whitespace-nowrap",
].join(" ");

export const theme = {
  label: "text-[14px] font-bold text-[#b3b3b3] select-none tracking-wide",

  input: [
    "w-full bg-[#242424] border border-[#3f3f3f] rounded-xl p-3",
    "text-[14px] text-white",
    "focus:outline-none focus:border-[#818cf8] focus:ring-2 focus:ring-[#818cf8]/20",
    "transition-all shadow-inner",
    "placeholder:text-[#555] placeholder:font-normal placeholder:not-italic",
  ].join(" "),

  btn: {
    main: `${BASE_BTN} text-[14px] px-5 py-2 gap-2`,
    sub:  `${BASE_BTN} text-[14px] px-4 py-1.5 gap-1.5`,
  },

  pill: {
    base: "px-5 py-2 rounded-full text-[14px] font-bold transition-all border focus:outline-none",
    inactive: "bg-[#2c2c2c] border-[#3f3f3f] text-[#b3b3b3] hover:border-[#818cf8]/50 hover:text-white",
    active: "bg-[#818cf8] border-[#818cf8] text-white shadow-[0_0_14px_rgba(129,140,248,0.45)] scale-105",
  },

  select: [
    "bg-[#242424] text-[14px] text-white border border-[#3f3f3f] rounded-xl pl-4 pr-10 py-2.5",
    "focus:outline-none focus:border-[#818cf8] focus:ring-2 focus:ring-[#818cf8]/20",
    "min-h-[44px] appearance-none cursor-pointer w-full transition-all",
  ].join(" "),
};
