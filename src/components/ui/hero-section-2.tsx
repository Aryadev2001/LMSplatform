"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Globe, Phone, MapPin, Activity } from "lucide-react";

// Icon for contact details — lucide-react (codebase convention)
const InfoIcon = ({ type }: { type: "website" | "phone" | "address" }) => {
  const icons = {
    website: <Globe className="h-5 w-5 text-primary" />,
    phone: <Phone className="h-5 w-5 text-primary" />,
    address: <MapPin className="h-5 w-5 text-primary" />,
  };
  return <div className="mr-2 flex-shrink-0">{icons[type]}</div>;
};

interface HeroSectionProps {
  className?: string;
  logo?: {
    url?: string;
    alt?: string;
    text?: string;
  };
  slogan?: string;
  title: React.ReactNode;
  subtitle: string;
  callToAction: {
    text: string;
    href: string;
  };
  /** Optional second link (e.g. student login) shown beside the primary CTA. */
  secondaryAction?: {
    text: string;
    href: string;
  };
  backgroundImage: string;
  contactInfo: {
    website: string;
    phone: string;
    address: string;
  };
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      className,
      logo,
      slogan,
      title,
      subtitle,
      callToAction,
      secondaryAction,
      backgroundImage,
      contactInfo,
    },
    ref,
  ) => {
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.2 },
      },
    };

    const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: { duration: 0.5, ease: "easeOut" as const },
      },
    };

    const showHeader = !!(logo || slogan);

    return (
      <motion.section
        ref={ref}
        className={cn(
          "relative flex w-full flex-col overflow-hidden bg-background text-foreground md:flex-row",
          className,
        )}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Left Side: Content */}
        <div className="flex w-full flex-col justify-between p-8 md:w-1/2 md:p-12 lg:w-3/5 lg:p-16">
          <div>
            {showHeader && (
              <motion.header className="mb-12" variants={itemVariants}>
                <div className="flex items-center">
                  {logo?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo.url}
                      alt={logo.alt ?? "Logo"}
                      className="mr-3 h-8"
                    />
                  ) : (
                    <div className="mr-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Activity className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    {logo?.text && (
                      <p className="text-lg font-bold text-foreground">
                        {logo.text}
                      </p>
                    )}
                    {slogan && (
                      <p className="text-xs tracking-wider text-muted-foreground">
                        {slogan}
                      </p>
                    )}
                  </div>
                </div>
              </motion.header>
            )}

            <motion.main variants={containerVariants}>
              <motion.h1
                className="text-4xl font-bold leading-tight text-foreground md:text-5xl"
                variants={itemVariants}
              >
                {title}
              </motion.h1>
              <motion.div
                className="my-6 h-1 w-20 bg-primary"
                variants={itemVariants}
              />
              <motion.p
                className="mb-8 max-w-md text-base text-muted-foreground"
                variants={itemVariants}
              >
                {subtitle}
              </motion.p>
              <motion.div
                className="flex flex-wrap items-center gap-x-8 gap-y-3"
                variants={itemVariants}
              >
                <a
                  href={callToAction.href}
                  className="text-lg font-bold tracking-widest text-primary transition-colors hover:text-primary/80"
                >
                  {callToAction.text}
                </a>
                {secondaryAction && (
                  <a
                    href={secondaryAction.href}
                    className="text-sm font-medium tracking-wide text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    {secondaryAction.text}
                  </a>
                )}
              </motion.div>
            </motion.main>
          </div>

          <motion.footer className="mt-12 w-full" variants={itemVariants}>
            <div className="grid grid-cols-1 gap-6 text-xs text-muted-foreground sm:grid-cols-3">
              <div className="flex items-center">
                <InfoIcon type="website" />
                <span>{contactInfo.website}</span>
              </div>
              <div className="flex items-center">
                <InfoIcon type="phone" />
                <span>{contactInfo.phone}</span>
              </div>
              <div className="flex items-center">
                <InfoIcon type="address" />
                <span>{contactInfo.address}</span>
              </div>
            </div>
          </motion.footer>
        </div>

        {/* Right Side: Image with clip-path reveal */}
        <motion.div
          className="min-h-[300px] w-full bg-cover bg-center md:min-h-full md:w-1/2 lg:w-2/5"
          style={{ backgroundImage: `url(${backgroundImage})` }}
          initial={{ clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)" }}
          animate={{ clipPath: "polygon(25% 0, 100% 0, 100% 100%, 0% 100%)" }}
          transition={{ duration: 1.2, ease: "circOut" }}
        />
      </motion.section>
    );
  },
);

HeroSection.displayName = "HeroSection";

export { HeroSection };
