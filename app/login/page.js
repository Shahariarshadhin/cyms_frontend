"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { saveSession } from "@/lib/auth";
import Image from "next/image";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(url, form);
      saveSession(data.token, data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.05fr_1fr] bg-[#FAF7F0]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap");
        .font-display {
          font-family: "Fraunces", serif;
        }
        .font-body {
          font-family: "Manrope", sans-serif;
        }
      `}</style>

      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0F3D2E] text-[#FAF7F0] px-14 py-12">
        <svg
          className="absolute inset-0 h-full w-full opacity-40"
          viewBox="0 0 500 800"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <motion.path
            d="M60 820 C 30 660, 150 610, 112 486 C 78 366, 205 342, 178 218 C 154 96, 262 78, 236 -30"
            stroke="#E8B54D"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />
          {[
            { cx: 108, cy: 500, r: 14, delay: 0.65 },
            { cx: 172, cy: 336, r: 11, delay: 1.05 },
            { cx: 212, cy: 158, r: 12, delay: 1.5 },
            { cx: 66, cy: 648, r: 10, delay: 0.35 },
          ].map((leaf, i) => (
            <motion.circle
              key={i}
              cx={leaf.cx}
              cy={leaf.cy}
              r={leaf.r}
              fill="#127548"
              stroke="#E8B54D"
              strokeWidth="1"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.9, scale: 1 }}
              transition={{ duration: 0.5, delay: leaf.delay }}
            />
          ))}
        </svg>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative flex items-center gap-3"
        >
          <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center overflow-hidden">
            <Image
              src="/assets/logo/Cozy-Yards.png"
              alt="Cozy Yards"
              width={64}
              height={64}
              className="w-16 h-16 object-contain"
            />
          </div>
          <span className="font-body text-sm tracking-wide text-[#DCE8DE]">
            Cozy Yards
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative max-w-lg"
        >
          <h1 className="font-display text-[2.75rem] leading-[1.08] font-medium">
            CYMS
          </h1>
          {/* <h1 className="font-display text-[2.75rem] leading-[1.08] font-medium">
            Cozy Yards Management System
          </h1> */}
          <h1 className="font-display text-[1.65rem] leading-[1.08] font-medium mt-3">
          Cozy Yards - Quality At Your Doorstep
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative font-body text-xs text-[#DCE8DE]/50"
        >
          © {new Date().getFullYear()} Cozy Yards Management System
        </motion.p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full max-w-[380px]"
        >
          <motion.div
            variants={item}
            className="flex lg:hidden flex-col items-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3">
              <Image
                src="/assets/logo/Cozy-Yards.png"
                alt="Cozy Yards"
                width={64}
                height={64}
                className="w-full h-full object-contain"
              />
            </div>
            <p className="font-body font-semibold text-[#127548] text-sm">
              Management System
            </p>
          </motion.div>

          <motion.div variants={item} className="mb-7">
            <h2 className="font-display text-3xl text-[#1C2620]">
              {mode === "login" ? "Welcome back" : "Set up your account"}
            </h2>
            <p className="font-body text-sm text-[#1C2620]/55 mt-1.5">
              {mode === "login"
                ? "Sign in to keep the season on schedule."
                : "Create the first admin account for your team."}
            </p>
          </motion.div>

          <motion.div
            variants={item}
            className="relative grid grid-cols-2 p-1 rounded-full bg-[#DCE8DE]/60 mb-7 font-body text-sm font-medium"
          >
            <motion.div
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[#127548]"
              animate={{ x: mode === "login" ? 0 : "calc(100% + 4px)" }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
            {["login", "register"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`relative z-10 py-2 rounded-full transition-colors duration-300 ${
                  mode === m ? "text-[#FAF7F0]" : "text-[#1C2620]/60"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </motion.div>

          <form onSubmit={submit} className="space-y-4">
            <AnimatePresence initial={false}>
              {mode === "register" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <label className="font-body text-xs font-medium text-[#1C2620]/70 mb-1.5 block">
                    Full name
                  </label>
                  <input
                    className="w-full font-body rounded-xl border border-[#DCE8DE] bg-white px-4 py-2.5 text-[#1C2620] text-sm outline-none focus:border-[#127548] focus:ring-2 focus:ring-[#127548]/15 transition"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={item}>
              <label className="font-body text-xs font-medium text-[#1C2620]/70 mb-1.5 block">
                Email
              </label>
              <input
                className="w-full font-body rounded-xl border border-[#DCE8DE] bg-white px-4 py-2.5 text-[#1C2620] text-sm outline-none focus:border-[#127548] focus:ring-2 focus:ring-[#127548]/15 transition"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </motion.div>

            <motion.div variants={item}>
              <label className="font-body text-xs font-medium text-[#1C2620]/70 mb-1.5 block">
                Password
              </label>
              <input
                className="w-full font-body rounded-xl border border-[#DCE8DE] bg-white px-4 py-2.5 text-[#1C2620] text-sm outline-none focus:border-[#127548] focus:ring-2 focus:ring-[#127548]/15 transition"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="font-body text-sm text-[#B3401E] bg-[#B3401E]/8 border border-[#B3401E]/15 rounded-lg px-3 py-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              variants={item}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              disabled={loading}
              className="w-full font-body font-medium bg-[#127548] text-[#FAF7F0] rounded-xl py-3 text-sm shadow-[0_8px_20px_-8px_rgba(18,117,72,0.55)] disabled:opacity-60 transition"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <motion.span
                    className="h-3.5 w-3.5 rounded-full border-2 border-[#FAF7F0]/40 border-t-[#FAF7F0]"
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.7,
                      ease: "linear",
                    }}
                  />
                  Please wait
                </span>
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
