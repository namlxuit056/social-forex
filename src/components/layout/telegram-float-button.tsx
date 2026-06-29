export function TelegramFloatButton() {
  return (
    <a
      href="https://t.me/toolforex"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join Telegram group"
      className="group fixed bottom-20 right-4 z-50 flex items-center gap-2 sm:right-5"
    >
      {/* Tooltip label */}
      <span className="pointer-events-none max-w-0 overflow-hidden whitespace-nowrap rounded-full bg-[#229ED9] px-0 py-1.5 text-sm font-medium text-white opacity-0 shadow-lg transition-all duration-300 group-hover:max-w-40 group-hover:px-4 group-hover:opacity-100">
        Join Telegram
      </span>

      {/* Button with pulse ring */}
      <span className="relative flex h-14 w-14 items-center justify-center">
        {/* Outer ping ring */}
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#229ED9] opacity-25" />
        {/* Button circle */}
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#229ED9] shadow-[0_4px_20px_rgba(34,158,217,0.5)] transition-transform duration-200 group-hover:scale-110">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 fill-white"
            aria-hidden="true"
          >
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </span>
      </span>
    </a>
  );
}
