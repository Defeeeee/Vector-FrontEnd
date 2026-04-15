"use client";

import { motion } from "framer-motion";
import { Compass, Check, ArrowRight, Shield, Zap, Globe, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "About", href: "#about" },
];

const features = [
  {
    title: "Real-time Tracking",
    description: "Monitor your flights with zero latency and high precision telemetry.",
    icon: <Zap className="w-6 h-6" />,
  },
  {
    title: "Global Coverage",
    description: "Access data from over 5,000 airports and every major airline worldwide.",
    icon: <Globe className="w-6 h-6" />,
  },
  {
    title: "Secure by Design",
    description: "Your flight data is encrypted and protected with enterprise-grade security.",
    icon: <Shield className="w-6 h-6" />,
  },
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="w-full flex flex-col bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-border-gray">
        <div className="container-wide flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-charcoal text-white rounded-lg flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-space-grotesk font-bold text-xl tracking-tighter">Vector</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-mid-gray hover:text-charcoal transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="h-4 w-px bg-border-gray" />
            <Link
              href="/login"
              className="text-sm font-medium text-charcoal hover:opacity-70 transition-opacity"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-charcoal text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-cal-highlight"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-border-gray p-6 flex flex-col space-y-4"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-lg font-medium text-charcoal"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <hr className="border-border-gray" />
            <Link href="/login" className="text-lg font-medium text-charcoal">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-charcoal text-white text-center font-semibold py-3 rounded-lg"
            >
              Get Started
            </Link>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="section-padding pt-40 md:pt-48 pb-20 overflow-hidden">
        <div className="container-wide flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 max-w-4xl"
          >
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-border-gray text-[10px] font-bold uppercase tracking-widest text-mid-gray">
              New: Real-time ACARS Integration
            </span>
            <h1 className="text-5xl md:text-7xl font-space-grotesk font-semibold text-charcoal leading-[1.05] tracking-[-0.04em]">
              The flight tracking infrastructure for modern pilots
            </h1>
            <p className="text-lg md:text-xl text-mid-gray max-w-2xl mx-auto font-light leading-relaxed">
              Vector provides a professional, minimal, and rock-solid digital logbook for pilots who demand precision and reliability.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-charcoal text-white px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity shadow-cal-highlight flex items-center justify-center space-x-2"
              >
                <span>Track your first flight</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto bg-white border border-border-gray px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                See how it works
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mt-20 w-full max-w-5xl rounded-2xl overflow-hidden border border-border-gray shadow-cal bg-[#fcfcfc] p-2"
          >
            <div className="aspect-[16/10] bg-white rounded-xl border border-border-gray flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none" />
              <div className="text-mid-gray/30 flex flex-col items-center">
                <Compass className="w-16 h-16 mb-4 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest">Dashboard Preview</span>
              </div>
              <div className="absolute top-4 right-4 flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-border-gray" />
                <div className="w-2 h-2 rounded-full bg-border-gray" />
                <div className="w-2 h-2 rounded-full bg-border-gray" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-border-gray bg-[#fcfcfc]">
        <div className="container-wide">
          <p className="text-center text-[10px] font-bold text-mid-gray uppercase tracking-[0.3em] mb-8">
            Trusted by pilots at leading airlines
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale contrast-125">
            {["IBERIA", "VUELING", "BRITISH AIRWAYS", "LUFTHANSA", "AIR FRANCE"].map((airline) => (
              <span key={airline} className="text-xl font-space-grotesk font-black tracking-tighter">
                {airline}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding bg-white">
        <div className="container-wide">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-semibold text-charcoal mb-6">
              A better way to keep your logs.
            </h2>
            <p className="text-xl text-mid-gray font-light">
              We've re-imagined the digital logbook from the ground up to be faster, cleaner, and more powerful than anything else.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-xl bg-white border border-border-gray shadow-cal hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-charcoal text-white rounded-lg flex items-center justify-center mb-6 shadow-cal-highlight">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-space-grotesk font-semibold mb-3">{feature.title}</h3>
                <p className="text-mid-gray font-light leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits List */}
      <section className="section-padding bg-[#fcfcfc] border-t border-border-gray">
        <div className="container-wide flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl font-space-grotesk font-semibold text-charcoal">
              Seamless synchronization across all your devices.
            </h2>
            <div className="space-y-4">
              {[
                "Automatic backup to encrypted cloud storage",
                "Offline access with background synchronization",
                "Export to EASA and FAA compliant formats",
                "Dark mode and high-contrast accessibility options"
              ].map((item) => (
                <div key={item} className="flex items-start space-x-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </div>
                  <span className="text-charcoal font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full max-w-lg aspect-square bg-white rounded-2xl border border-border-gray shadow-cal p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-charcoal/5 blur-3xl -mr-32 -mt-32" />
             <div className="relative z-10 h-full flex flex-col justify-center space-y-6">
                <div className="h-4 w-2/3 bg-border-gray rounded-full" />
                <div className="h-4 w-1/2 bg-border-gray rounded-full" />
                <div className="h-24 w-full bg-border-gray/50 rounded-xl" />
                <div className="h-4 w-3/4 bg-border-gray rounded-full" />
                <div className="h-4 w-1/3 bg-border-gray rounded-full" />
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-white">
        <div className="container-wide">
          <div className="bg-charcoal rounded-3xl p-12 md:p-24 text-center space-y-8 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
            <h2 className="text-4xl md:text-6xl font-space-grotesk font-semibold text-white tracking-tight">
              Ready to modernize your flight logs?
            </h2>
            <p className="text-white/60 text-lg md:text-xl max-w-xl mx-auto font-light">
              Join thousands of pilots who have already switched to Vector. Start your free 14-day trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto bg-white text-charcoal px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/90 transition-colors"
              >
                Create your account
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/5 transition-colors border border-white/20"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border-gray bg-white">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-charcoal text-white rounded flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-space-grotesk font-bold text-lg tracking-tighter">Vector</span>
            </div>
            <div className="flex space-x-8 text-sm font-medium text-mid-gray">
              <Link href="#" className="hover:text-charcoal transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-charcoal transition-colors">GitHub</Link>
              <Link href="#" className="hover:text-charcoal transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-charcoal transition-colors">Terms</Link>
            </div>
            <p className="text-xs text-mid-gray">
              &copy; 2026 Vector Aviation. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
