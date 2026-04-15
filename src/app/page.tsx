"use client";

import { motion } from "framer-motion";
import { Compass, Check, ArrowRight, Shield, Zap, Globe, Menu, X, Layout, Database, TrendingUp, Award, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "Solutions", href: "#solutions" },
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="w-full flex flex-col min-h-screen bg-zinc-50 overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="container-wide flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2 text-zinc-900 group">
            <div className="w-8 h-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-space-grotesk font-bold text-xl tracking-tighter uppercase">Vector</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors uppercase tracking-widest"
              >
                {link.name}
              </Link>
            ))}
            <div className="h-4 w-px bg-zinc-200" />
            <Link
              href="/login"
              className="text-sm font-bold text-zinc-900 hover:opacity-70 transition-opacity uppercase tracking-widest"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-zinc-900 text-white text-[10px] uppercase tracking-[0.2em] font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-cal-highlight"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-zinc-900" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-zinc-200 p-6 flex flex-col space-y-4 shadow-cal"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-lg font-bold text-zinc-900 uppercase tracking-widest"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <hr className="border-zinc-100" />
            <Link href="/login" className="text-lg font-bold text-zinc-900 uppercase tracking-widest">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-zinc-900 text-white text-center font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg"
            >
              Get Started
            </Link>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-40 md:pt-56 pb-20 relative z-10 px-4 md:px-0">
        <div className="container-wide flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 max-w-5xl"
          >
            <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-zinc-900 animate-pulse" />
              <span>Avionics Grade Logbook</span>
            </span>
            <h1 className="text-6xl md:text-9xl font-space-grotesk font-bold text-zinc-900 leading-[0.95] tracking-tighter uppercase">
              Precision logs. <br className="hidden md:block" /> Zero friction.
            </h1>
            <p className="text-lg md:text-2xl text-zinc-500 max-w-2xl mx-auto font-medium leading-relaxed">
              Vector is a monochromatic, high-contrast digital logbook engineered for pilots who demand reliability and clean data.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-zinc-900 text-white px-10 py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity shadow-cal-highlight flex items-center justify-center space-x-3 hover:scale-105 active:scale-95"
              >
                <span>Track your first flight</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto bg-white border border-zinc-200 px-10 py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-50 transition-colors flex items-center justify-center text-zinc-900 shadow-sm"
              >
                See how it works
              </Link>
            </div>
          </motion.div>

          {/* Interface Mockup - Bento Box Style */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mt-24 w-full max-w-6xl rounded-[2.5rem] border border-zinc-200 shadow-cal bg-white p-2 md:p-4 overflow-hidden relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-zinc-100 rounded-full blur-[100px] opacity-50 pointer-events-none" />
            <div className="w-full bg-zinc-50 rounded-[2rem] border border-zinc-200 overflow-hidden shadow-inner flex flex-col relative z-10">
                {/* Mock Header */}
                <div className="h-12 bg-white border-b border-zinc-200 flex items-center px-6 space-x-2">
                    <div className="w-3 h-3 rounded-full bg-zinc-200" />
                    <div className="w-3 h-3 rounded-full bg-zinc-200" />
                    <div className="w-3 h-3 rounded-full bg-zinc-200" />
                </div>
                {/* Mock Content */}
                <div className="flex flex-col md:flex-row p-6 gap-6 h-[600px]">
                    {/* Mock Sidebar */}
                    <div className="hidden md:flex w-64 bg-white border border-zinc-200 rounded-[2rem] flex-col p-6 space-y-8 shadow-sm">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-zinc-900 rounded-xl" />
                            <div className="h-4 w-20 bg-zinc-200 rounded" />
                        </div>
                        <div className="space-y-4">
                            <div className="h-12 w-full bg-zinc-100 rounded-xl" />
                            <div className="h-12 w-full bg-zinc-50 rounded-xl" />
                            <div className="h-12 w-full bg-zinc-50 rounded-xl" />
                        </div>
                    </div>
                    {/* Mock Main Area (Bento Grid) */}
                    <div className="flex-1 flex flex-col gap-6">
                        {/* Header Area */}
                        <div className="flex items-center justify-between">
                            <div className="h-10 w-48 bg-zinc-200 rounded-xl" />
                            <div className="h-10 w-32 bg-zinc-900 rounded-xl" />
                        </div>
                        {/* Bento Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                            <div className="md:col-span-2 bg-zinc-900 rounded-[2rem] p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Award className="w-6 h-6 text-white" /></div>
                                <div className="space-y-2">
                                    <div className="h-4 w-32 bg-white/20 rounded" />
                                    <div className="h-16 w-48 bg-white rounded-xl" />
                                </div>
                            </div>
                            <div className="bg-white border border-zinc-200 rounded-[2rem] p-8 flex flex-col justify-between shadow-sm">
                                <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-zinc-900" /></div>
                                <div className="h-12 w-32 bg-zinc-100 rounded-xl" />
                            </div>
                            <div className="md:col-span-3 bg-white border border-zinc-200 rounded-[2rem] p-8 flex flex-col space-y-4 shadow-sm">
                                <div className="h-6 w-32 bg-zinc-200 rounded" />
                                <div className="space-y-3">
                                    <div className="h-12 w-full bg-zinc-50 rounded-xl" />
                                    <div className="h-12 w-full bg-zinc-50 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-zinc-200 bg-white relative z-10">
        <div className="container-wide">
          <p className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] mb-8">
            Trusted by pilots at leading airlines
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-zinc-300">
            {["IBERIA", "VUELING", "BRITISH AIRWAYS", "LUFTHANSA", "AIR FRANCE"].map((airline) => (
              <span key={airline} className="text-xl font-space-grotesk font-black tracking-tighter">
                {airline}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding bg-zinc-50 relative z-10">
        <div className="container-wide">
          <div className="max-w-3xl mb-16">
            <h2 className="text-5xl font-space-grotesk font-bold text-zinc-900 mb-6 tracking-tighter uppercase">
              Engineered for extreme precision.
            </h2>
            <p className="text-xl text-zinc-500 font-medium">
              We've re-imagined the digital logbook from the ground up to be faster, cleaner, and more powerful than anything else. No fluff, just data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { t: "Clean Interface", d: "Designed for high-stress environments. No clutter, just the data you need.", i: <Layout className="w-6 h-6" /> },
              { t: "Secure Sync", d: "Your flight data is encrypted and synced across all your devices instantly.", i: <Database className="w-6 h-6" /> },
              { t: "Compliance Ready", d: "Generate EASA and FAA compliant logbook exports with a single click.", i: <Shield className="w-6 h-6" /> }
            ].map((feature, i) => (
              <motion.div
                key={feature.t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 rounded-[2rem] bg-white border border-zinc-200 shadow-sm hover:shadow-cal transition-shadow space-y-6"
              >
                <div className="w-14 h-14 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                  {feature.i}
                </div>
                <h3 className="text-2xl font-space-grotesk font-bold text-zinc-900 tracking-tight">{feature.t}</h3>
                <p className="text-zinc-500 font-medium leading-relaxed">
                  {feature.d}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits List */}
      <section className="section-padding bg-white border-t border-zinc-200 relative z-10">
        <div className="container-wide flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1 space-y-8">
            <h2 className="text-5xl font-space-grotesk font-bold text-zinc-900 tracking-tighter uppercase leading-[1.1]">
              Seamless sync across all your devices.
            </h2>
            <div className="space-y-4">
              {[
                "Automatic backup to encrypted cloud storage",
                "Offline access with background synchronization",
                "Export to EASA and FAA compliant formats",
                "Built natively for desktop and mobile web"
              ].map((item) => (
                <div key={item} className="flex items-center space-x-4">
                  <div className="w-6 h-6 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </div>
                  <span className="text-zinc-900 font-bold">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full max-w-lg aspect-square bg-zinc-50 rounded-[3rem] border border-zinc-200 shadow-cal p-8 relative overflow-hidden flex items-center justify-center">
             <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-200/50 blur-3xl -mr-32 -mt-32 rounded-full" />
             <div className="w-full bg-white border border-zinc-200 rounded-[2rem] p-8 shadow-sm space-y-6 relative z-10">
                <div className="flex items-baseline space-x-2">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total PIC</div>
                    <div className="text-5xl font-space-grotesk font-bold text-zinc-900 tracking-tighter">4,285.5</div>
                </div>
                <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-zinc-900" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl space-y-1">
                        <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Night</div>
                        <div className="text-xl font-bold text-zinc-900">842.2</div>
                     </div>
                     <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl space-y-1">
                        <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Instrument</div>
                        <div className="text-xl font-bold text-zinc-900">1,240.0</div>
                     </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-zinc-50 border-t border-zinc-200 relative z-10 pb-40">
        <div className="container-wide">
          <div className="bg-zinc-900 rounded-[3rem] p-12 md:p-32 text-center space-y-10 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
            <h2 className="text-5xl md:text-7xl font-space-grotesk font-bold text-white tracking-tighter uppercase relative z-10">
              Ready to modernize?
            </h2>
            <p className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto font-medium relative z-10">
              Join thousands of professional pilots who have already switched to Vector. Start your free 14-day trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 relative z-10">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-white text-zinc-900 px-10 py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-cal-highlight hover:scale-105 active:scale-95 transition-all"
              >
                Create your account
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto text-white px-10 py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-colors border border-white/20"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200 bg-white relative z-10">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center shadow-lg">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-space-grotesk font-bold text-xl tracking-tighter uppercase">Vector</span>
            </div>
            <div className="flex space-x-8 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <Link href="#" className="hover:text-zinc-900 transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-zinc-900 transition-colors">GitHub</Link>
              <Link href="#" className="hover:text-zinc-900 transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-zinc-900 transition-colors">Terms</Link>
            </div>
            <p className="text-xs text-zinc-400 font-bold">
              &copy; 2026 Vector Aviation. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
