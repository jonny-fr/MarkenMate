"use client";

import { use } from "react";
import { Clock, Info, Mail, MapPin, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
    <Card id="info" className="h-full">
      <CardHeader>
        <CardTitle>Allgemeine Infos</CardTitle>
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
              <li
                key={slot.day}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2"
              >
                <span className="font-medium text-foreground">{slot.day}</span>
                <span>{slot.hours}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4" />
            Standort
          </div>
          <p className="rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
            {info.location}
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Info className="size-4" />
            Hinweise
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {info.notes.map((note, index) => (
              <li
                key={`${note}-${index.toString()}`}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
              >
                <Badge variant="secondary" className="mt-0.5">
                  Neu
                </Badge>
                <span>{note}</span>
              </li>
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
  );
}
