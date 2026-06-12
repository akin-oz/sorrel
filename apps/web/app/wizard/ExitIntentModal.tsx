"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

interface ExitIntentModalProps {
  open: boolean;
  /** User chose to stay — the recovery win. */
  onRecover: () => void;
  /** User chose to leave (button, Escape, or backdrop). */
  onLeave: () => void;
}

/**
 * Exit-intent recovery modal (spec 010) as a MUI `Dialog`: focus trap,
 * Escape/backdrop close, and transitions come from the component. The global
 * prefers-reduced-motion rule (globals.css) collapses the transition. Copy is
 * brand-safe and invents nothing — keyed to the local-resume already built.
 */
export function ExitIntentModal({ open, onRecover, onLeave }: ExitIntentModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onLeave}
      aria-labelledby="exit-intent-title"
      slotProps={{
        paper: {
          sx: { borderRadius: "16px", p: 1, maxWidth: "26rem", bgcolor: "background.paper" },
        },
      }}
    >
      <DialogTitle
        id="exit-intent-title"
        sx={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "1.5rem" }}
      >
        Leaving so soon?
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: "text.secondary" }}>
          We&apos;ve saved your progress — pick up right where you left off whenever you&apos;re
          ready.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", gap: 1, px: 3, pb: 3 }}>
        <Button onClick={onRecover} variant="contained" size="large" fullWidth>
          Keep going
        </Button>
        <Button
          onClick={onLeave}
          variant="outlined"
          size="large"
          fullWidth
          sx={{ ml: "0 !important" }}
        >
          Leave for now
        </Button>
      </DialogActions>
    </Dialog>
  );
}
