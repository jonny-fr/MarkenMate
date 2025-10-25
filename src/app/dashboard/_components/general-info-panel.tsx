"use client";

import { use } from "react";
import { Clock, Info, Mail, MapPin, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import StarBorder from "@/components/StarBorder";
import { AuroraBackground } from "@/components/aurora";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type GeneralInfo = {
  location: string;
  openingHours: Array<{
    day: string;
    hours: string;
  }>;
  contact: {
    phone: string;
    email: string;
  };
  notes: string[];
};

export function GeneralInfoPanel({
  dataPromise,
}: {
  dataPromise: Promise<GeneralInfo>;
}) {
  const info = use(dataPromise);

  return (
    <AuroraBackground className="rounded-lg">
      <Card id="info" className="h-full border-none bg-transparent backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-muted-foreground">Allgemeine Infos</CardTitle>
          <CardDescription>
            Öffnungszeiten, Standort und aktuelle Hinweise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4" />
              Öffnungszeiten
            </div>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {info.openingHours.map((slot) => (
                <StarBorder key={slot.day} className="rounded-lg" color="rgba(168, 85, 247, 0.8)" speed="6s">
                  <li className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                    <span className="font-medium text-muted-foreground">{slot.day}</span>
                    <span className="text-muted-foreground">{slot.hours}</span>
                  </li>
                </StarBorder>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="size-4" />
              Standort
            </div>
            <StarBorder className="rounded-lg" color="rgba(168, 85, 247, 0.8)" speed="6s">
              <p className="rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                {info.location}
              </p>
            </StarBorder>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Info className="size-4" />
              Hinweise
            </div>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {info.notes.map((note, index) => (
                <StarBorder key={`${note}-${index.toString()}`} className="rounded-lg" color="rgba(168, 85, 247, 0.8)" speed="6s">
                  <li className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                    <Badge variant="secondary" className="mt-0.5">
                      Neu
                    </Badge>
                    <span>{note}</span>
                  </li>
                </StarBorder>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Phone className="size-4" />
              Kontakt
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Phone className="size-4" />
                {info.contact.phone}
              </span>
              <span className="flex items-center gap-2">
                <Mail className="size-4" />
                {info.contact.email}
              </span>
            </div>
          </section>
        </CardContent>
      </Card>
    </AuroraBackground>
  );
}
