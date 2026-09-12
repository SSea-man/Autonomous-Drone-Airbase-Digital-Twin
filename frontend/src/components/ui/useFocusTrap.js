import { useEffect, useRef } from "react";
/** Focus trap utility for accessible modals and dialogs */
export function useFocusTrap(active) {
    const ref = useRef(null);
    useEffect(() => {
        if (!active || !ref.current)
            return;
        const root = ref.current;
        const prev = document.activeElement;
        const focusable = () => Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute("disabled"));
        (focusable()[0] ?? root).focus();
        const onKey = (e) => {
            if (e.key !== "Tab")
                return;
            const els = focusable();
            if (!els.length)
                return;
            const first = els[0], last = els[els.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
            else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        root.addEventListener("keydown", onKey);
        return () => { root.removeEventListener("keydown", onKey); prev?.focus?.(); };
    }, [active]);
    return ref;
}
