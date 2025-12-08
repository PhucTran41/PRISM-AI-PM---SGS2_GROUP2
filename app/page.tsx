"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import Prism from "@/components/Prism";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Prism 3D Background - fixed layer */}
      {/* Prism 3D Background - fixed layer */}
      <div className="fixed inset-0 z-0">
        {" "}
        {/* Changed from -z-10 to z-0 */}
        <Prism
          animationType="rotate"
          timeScale={0.5}
          scale={3.6}
          height={3.5}
          baseWidth={5.5}
          noise={0} // Changed from 0.5 to 0
          glow={1} // Changed from 3 to 1
          hueShift={0} // Keeping at 0
          colorFrequency={1} // Keeping at 1
          transparent={false}
          bloom={1}
        />
      </div>

      {/* Content layer */}
      <div className="relative z-10">
        <Navigation />

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/90 backdrop-blur-sm px-4 py-1.5 text-sm text-blue-600">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Project Management</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white">
              Turn Ideas into Actionable{" "}
              <span className="text-blue-700">Blueprints</span> with AI
            </h1>

            {/* Subtext */}
            <p className="text-lg md:text-xl text-white-300 max-w-2xl mx-auto">
              PRISM instantly generates Project Charters, Roadmaps, and User
              Stories. Transform your vision into structured, ready-to-execute
              plans in seconds.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/register">
                <button className="inline-flex items-center gap-2 px-8 py-3 text-base font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all">
                  Start a New Project (Free)
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <a href="#how-it-works">
                <button className="px-8 py-3 text-base font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-all">
                  See How It Works
                </button>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white-400">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                <span>Free forever plan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                <span>Setup in 60 seconds</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
