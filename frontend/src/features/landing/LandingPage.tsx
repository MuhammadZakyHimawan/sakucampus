import { AboutSection } from './sections/AboutSection';
import { ClosingCtaSection } from './sections/ClosingCtaSection';
import { DashboardPreviewSection } from './sections/DashboardPreviewSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { HeroSection } from './sections/HeroSection';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { ProblemSolutionSection } from './sections/ProblemSolutionSection';

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <HowItWorksSection />
      <DashboardPreviewSection />
      <AboutSection />
      <ClosingCtaSection />
    </>
  );
}
