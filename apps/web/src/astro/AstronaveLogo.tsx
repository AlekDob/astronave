/** The app mark next to the wordmark: a small rocket climbing at 45 degrees, one color. */
export function AstronaveLogo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="relative z-10 size-[18px] shrink-0 text-foreground"
      fill="currentColor"
    >
      <g transform="rotate(45 12 12)">
        {/* Body with the window cut out (evenodd). */}
        <path
          fillRule="evenodd"
          d="M12 1.5c2.6 2 4 5.2 4 8.9v6.1H8v-6.1c0-3.7 1.4-6.9 4-8.9Zm0 6.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z"
        />
        <path d="M8 12.5 5 15.6v2.4l3-1.5ZM16 12.5l3 3.1v2.4l-3-1.5Z" />
        <path d="M10.2 17.5h3.6L12 22.5Z" opacity="0.7" />
      </g>
    </svg>
  );
}
