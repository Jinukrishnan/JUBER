import Link from "next/link";
import { APP_NAME } from "@/game/constants";
import { BusSticker, ChaiSticker, PlateSticker, TeaSticker, TicketSticker } from "@/ui/stickers";

const STEPS = [
  { n: "1", title: "Choose your ride", body: "Take out a Yamaha R15 bike (1 passenger), an auto-rickshaw (2) or a Swift Dzire car (3)." },
  { n: "2", title: "Accept, pick up, drop", body: "Accept a request, stop at the customer, hear where they want to go, then follow the radar route to the drop." },
  { n: "3", title: "Reach the daily goal", body: "Clear the vehicle rent with fares, obey the signals, and finish the day in profit." },
];

const KEYS: [string, string][] = [
  ["W / S", "Gas · brake"],
  ["A / D", "Steer"],
  ["Space", "Hand brake"],
  ["1 2 3 / X", "Accept / skip request"],
  ["Enter", "Accept ride"],
  ["C", "Camera"],
  ["H", "Horn"],
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative mx-auto flex min-h-[min(760px,100svh)] max-w-6xl flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
        <BusSticker className="sticker [--r:-6deg] absolute left-[4%] top-[10%] hidden h-28 w-36 md:block" />
        <TeaSticker className="sticker [--r:7deg] absolute right-[8%] top-[8%] hidden h-24 w-28 md:block" />
        <ChaiSticker className="sticker [--r:5deg] absolute bottom-[12%] left-[10%] hidden h-24 w-32 md:block" />
        <TicketSticker className="sticker [--r:-8deg] absolute bottom-[10%] right-[6%] hidden h-24 w-32 md:block" />
        <PlateSticker className="sticker [--r:-3deg] absolute left-1/2 top-[4%] hidden h-20 w-28 lg:block" />

        <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-60">Kerala · bike · auto · car</p>
        <h1 className="mt-4 font-malayalam text-6xl font-extrabold leading-tight sm:text-8xl">ആനവണ്ടി</h1>
        <p className="text-4xl font-extrabold tracking-tight text-accent sm:text-6xl">{APP_NAME}</p>
        <p className="mt-6 max-w-xl text-lg opacity-80">
          Be the driver your town calls. Take a ride request, pick up the customer, follow the radar to where
          they are going, and finish the day in profit.
        </p>

        <div className="mt-4 flex gap-3 md:hidden">
          <BusSticker className="sticker [--r:-5deg] h-16 w-20" />
          <TeaSticker className="sticker [--r:4deg] h-16 w-20" />
          <TicketSticker className="sticker [--r:-4deg] h-16 w-20" />
        </div>

        <Link
          href="/login"
          className="mt-8 rounded-full bg-ink px-8 py-4 text-lg font-semibold text-cream shadow-lg transition hover:-translate-y-0.5"
        >
          Start the day
        </Link>
        <p className="mt-3 text-xs opacity-60">Best on desktop with a keyboard.</p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest opacity-60">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-line bg-cream p-5">
              <span className="font-mono text-sm text-accent">{s.n}</span>
              <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm opacity-75">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest opacity-60">Controls</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {KEYS.map(([k, d]) => (
            <li key={k} className="flex items-center gap-3 rounded-xl border border-line bg-cream px-3 py-2 text-sm">
              <kbd className="rounded border border-line bg-paper-sunk px-2 py-0.5 font-mono text-xs">{k}</kbd>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
