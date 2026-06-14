"use client";

import { useState } from "react";

import { storyblokEditable } from "@storyblok/react/rsc";

import { AppBand, AppBox, AppCard, AppHeading, AppStack, AppText } from "@sorrel/ui";

import type { FaqItemBlok, FaqSectionBlok } from "../../types/storyblok.gen";

function FaqRow({ blok, isLast }: { blok: FaqItemBlok; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const buttonId = `faq-button-${blok._uid}`;
  const panelId = `faq-panel-${blok._uid}`;
  return (
    <AppCard
      tone="transparent"
      border={false}
      radius={0}
      padding={0}
      borderTop
      borderBottom={isLast}
      editable={storyblokEditable(blok)}
    >
      <button
        type="button"
        id={buttonId}
        className="app-unstyled-button app-faq-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <AppStack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1.5}
          minHeight={{ xs: 56, md: 60 }}
        >
          <AppText fontWeight={600} color="text.primary" fontSize={{ xs: 15, md: 16 }}>
            {blok.question}
          </AppText>
          <AppStack
            alignItems="center"
            justifyContent="center"
            width={44}
            minHeight={44}
            aria-hidden
          >
            <AppText color="primary.main" fontSize={{ xs: 20, md: 22 }}>
              {open ? "–" : "+"}
            </AppText>
          </AppStack>
        </AppStack>
      </button>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        <AppBox pr={5.5} pb={{ xs: 2, md: 2.25 }}>
          <AppText
            variant="body2"
            color="text.secondary"
            fontSize={{ xs: 14, md: 15 }}
            lineHeight={1.6}
          >
            {blok.answer}
          </AppText>
        </AppBox>
      </div>
    </AppCard>
  );
}

export function FaqSection({ blok }: { blok: FaqSectionBlok }) {
  const items = blok.items ?? [];
  return (
    <AppBand editable={storyblokEditable(blok)} id="faq" tone="paper" maxWidth={720}>
      <AppStack gap={{ xs: 2, md: 2.25 }} py={{ xs: 5.5, md: 10 }}>
        <AppHeading level={2} fontSize={{ xs: 24, md: 32 }}>
          {blok.heading}
        </AppHeading>
        <AppStack>
          {items.map((item, i) => (
            <FaqRow key={item._uid} blok={item} isLast={i === items.length - 1} />
          ))}
        </AppStack>
      </AppStack>
    </AppBand>
  );
}
