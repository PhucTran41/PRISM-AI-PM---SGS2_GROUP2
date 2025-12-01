// app/dashboard/new-project/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, ArrowLeft, Wand2 } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [projectBrief, setProjectBrief] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const charCount = projectBrief.length;
  const minChars = 50;
  const maxChars = 2000;
  const isValidLength = charCount >= minChars && charCount <= maxChars;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidLength) {
      return;
    }

    setIsGenerating(true);

    // TODO: Replace with actual OpenAI API call in Week 3
    // Simulating API call for now
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // TODO: Save project to database and get project ID
    // For now, just redirect to dashboard
    console.log("Project Name:", projectName);
    console.log("Project Brief:", projectBrief);

    // After OpenAI integration, you'll redirect to the generated document:
    // router.push(`/dashboard/project/${projectId}`);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Back to Dashboard
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">PRISM</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
          <p className="text-muted-foreground">
            Describe your project idea and let AI generate comprehensive
            documentation for you.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Provide a clear description of your project. The more details you
              include, the better the generated documentation will be.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="projectName">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <input
                  id="projectName"
                  type="text"
                  placeholder="e.g., E-commerce Mobile App"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  disabled={isGenerating}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Project Brief */}
              <div className="space-y-2">
                <Label htmlFor="projectBrief">
                  Project Brief <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="projectBrief"
                  placeholder="Describe your project in detail. Include information about:&#10;• What problem does it solve?&#10;• Who are the target users?&#10;• What are the main features?&#10;• Any technical requirements or constraints?&#10;&#10;Example: 'A mobile app for small business owners to manage inventory, track sales, and generate reports. The app should work offline and sync when connected. Target users are non-tech-savvy shop owners who need a simple, intuitive interface...'"
                  value={projectBrief}
                  onChange={(e) => setProjectBrief(e.target.value)}
                  required
                  disabled={isGenerating}
                  rows={12}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {/* Character Counter */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span
                      className={`${
                        charCount < minChars
                          ? "text-muted-foreground"
                          : charCount > maxChars
                          ? "text-destructive"
                          : "text-green-500"
                      }`}
                    >
                      {charCount} / {maxChars} characters
                    </span>
                    {charCount < minChars && (
                      <span className="text-muted-foreground">
                        (Minimum {minChars} characters)
                      </span>
                    )}
                  </div>
                  {charCount > maxChars && (
                    <span className="text-destructive">
                      Exceeds maximum length
                    </span>
                  )}
                </div>
              </div>

              {/* Tips Card */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h3 className="text-sm font-semibold mb-2 text-blue-400">
                  💡 Tips for Better Results
                </h3>
                <ul className="text-sm text-blue-300 space-y-1 ml-4 list-disc">
                  <li>
                    Be specific about your target audience and their needs
                  </li>
                  <li>Mention key features and functionalities you envision</li>
                  <li>
                    Include any technical constraints or platform preferences
                  </li>
                  <li>Describe the problem you're trying to solve clearly</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!projectName || !isValidLength || isGenerating}
                  className="flex-1 gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Generating Documents...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Generate Documentation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="mt-8 p-6 bg-card border border-border rounded-lg">
          <h3 className="font-semibold mb-3">What happens next?</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✨ AI will analyze your project brief</p>
            <p>📄 Generate 4 comprehensive documents:</p>
            <ul className="ml-6 space-y-1">
              <li>
                • <span className="text-foreground">Project Overview</span> -
                High-level summary and goals
              </li>
              <li>
                •{" "}
                <span className="text-foreground">Feature Specifications</span>{" "}
                - Detailed feature breakdown
              </li>
              <li>
                • <span className="text-foreground">User Stories</span> -
                User-centric requirements
              </li>
              <li>
                • <span className="text-foreground">Development Roadmap</span> -
                Timeline and milestones
              </li>
            </ul>
            <p className="pt-2">
              💬 You can refine any document using the chat interface
            </p>
            <p>📥 Export in multiple formats (PDF, Markdown, DOCX)</p>
          </div>
        </div>
      </main>
    </div>
  );
}
