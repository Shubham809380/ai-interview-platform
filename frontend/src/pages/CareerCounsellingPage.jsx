import { useMemo, useState } from "react";
import { CalendarDays, Filter, Search, ShieldCheck, Star, Video } from "lucide-react";

const COUNSELLORS = [
  {
    id: "c-1",
    name: "Ichha Bindra",
    role: "Talent Acquisition Specialist",
    experience: 4,
    rating: 4.8,
    reviews: 31,
    sessions: 142,
    price: 1500,
    available: true,
    summary: "Experienced talent acquisition professional focused on interview strategy and career transitions.",
    tags: ["Resume Review and Writing", "Interview Preparation", "Early Career"],
    durations: ["30 min", "60 min"]
  },
  {
    id: "c-2",
    name: "Tanmay Shrivastava",
    role: "Senior Analytics Mentor",
    experience: 9,
    rating: 4.9,
    reviews: 54,
    sessions: 206,
    price: 1500,
    available: true,
    summary: "Helps candidates prepare for data and analytics interviews with structured mock rounds.",
    tags: ["Resume Review and Writing", "Interview Preparation", "Data Career"],
    durations: ["10 min", "30 min", "60 min"]
  },
  {
    id: "c-3",
    name: "Priyanshu Choudhary",
    role: "Management Consulting Coach",
    experience: 1,
    rating: 4.7,
    reviews: 12,
    sessions: 64,
    price: 1500,
    available: true,
    summary: "Guides candidates on storytelling, case interviews, and strategic communication.",
    tags: ["Career Discovery", "Resume Review and Writing", "Interview Preparation"],
    durations: ["10 min", "30 min", "60 min"]
  },
  {
    id: "c-4",
    name: "Nina Mukherji",
    role: "Career Growth Advisor",
    experience: 7,
    rating: 4.9,
    reviews: 47,
    sessions: 188,
    price: 1800,
    available: false,
    summary: "Specializes in career pivots, promotion planning, and long-term growth roadmaps.",
    tags: ["Career Growth", "Leadership", "Interview Preparation"],
    durations: ["30 min", "60 min"]
  },
  {
    id: "c-5",
    name: "Vidhi Waghela",
    role: "Product Career Counsellor",
    experience: 3,
    rating: 4.6,
    reviews: 18,
    sessions: 83,
    price: 1200,
    available: true,
    summary: "Supports PM and product-analytics aspirants with targeted interview prep.",
    tags: ["Product Roles", "Resume Review and Writing", "Interview Preparation"],
    durations: ["30 min", "60 min"]
  }
];

function StatCard({ title, value, subtitle, accent }) {
  return (
    <article className={`rounded-xl border bg-white p-4 dark:bg-slate-900 ${accent}`}>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </article>
  );
}

export function CareerCounsellingPage() {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("highest");
  const [selectedCounsellor, setSelectedCounsellor] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState("30 min");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [bookingNotice, setBookingNotice] = useState("");

  const counsellors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = COUNSELLORS.filter((person) => {
      if (!normalizedQuery) {
        return true;
      }

      const searchable = `${person.name} ${person.role} ${person.tags.join(" ")}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });

    return filtered.sort((left, right) => {
      if (sortBy === "experience") {
        return right.experience - left.experience;
      }
      return right.rating - left.rating;
    });
  }, [query, sortBy]);

  const availableSlots = useMemo(() => {
    if (!selectedCounsellor) return [];
    return ["10:00 AM", "12:00 PM", "03:00 PM", "06:00 PM"];
  }, [selectedCounsellor]);

  function startBooking(person) {
    setSelectedCounsellor(person);
    setSelectedDuration(person.durations[0] || "30 min");
    setSelectedDate("");
    setSelectedSlot("");
    setBookingNotice("");
  }

  function confirmBooking() {
    if (!selectedCounsellor || !selectedDate || !selectedSlot) {
      setBookingNotice("Please select date and slot before confirming.");
      return;
    }
    setBookingNotice(
      `Session booked with ${selectedCounsellor.name} on ${selectedDate} at ${selectedSlot} (${selectedDuration}).`
    );
  }

  return (
    <div className="grid gap-4">
      <section className="glass-panel rounded-2xl p-5">
        <h1 className="text-center font-display text-4xl font-extrabold text-brand-600 dark:text-brand-300">Career Counselling</h1>
        <p className="mx-auto mt-2 max-w-3xl text-center text-sm text-slate-600 dark:text-slate-300">
          Connect with expert career counsellors for personalized guidance on your professional journey.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Expert Counsellors" value="14+" subtitle="Experienced mentors" accent="border-brand-300 dark:border-brand-600/40" />
          <StatCard title="Sessions Completed" value="5+" subtitle="Successful consults" accent="border-emerald-300 dark:border-emerald-600/40" />
          <StatCard title="Average Rating" value="4.8" subtitle="From active users" accent="border-violet-300 dark:border-violet-600/40" />
          <StatCard title="Available Slots" value="24/7" subtitle="Flexible booking" accent="border-amber-300 dark:border-amber-600/40" />
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or expertise..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <Filter size={16} className="text-slate-500" />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              <option value="highest">Highest Rated</option>
              <option value="experience">Most Experienced</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {counsellors.map((person) => (
          <article key={person.id} className="glass-panel rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">{person.name}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{person.role}</p>
              </div>
              <span
                className={[
                  "rounded-full px-2 py-1 text-xs font-semibold",
                  person.available
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                ].join(" ")}
              >
                {person.available ? "Available" : "Busy"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <p className="inline-flex items-center gap-1">
                <Star size={13} className="text-amber-500" />
                {person.rating} ({person.reviews})
              </p>
              <p className="inline-flex items-center gap-1">
                <ShieldCheck size={13} className="text-brand-500" />
                {person.experience} yr
              </p>
              <p className="inline-flex items-center gap-1">
                <Video size={13} className="text-emerald-500" />
                {person.sessions} sessions
              </p>
            </div>

            <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{person.summary}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.tags.map((tag) => (
                <span
                  key={`${person.id}-${tag}`}
                  className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Starting from</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Rs {person.price}</p>
              </div>
              <button
                type="button"
                onClick={() => startBooking(person)}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Book Now
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <CalendarDays size={13} />
              {person.durations.map((duration) => (
                <span key={`${person.id}-${duration}`} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
                  {duration}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      {selectedCounsellor ? (
        <section className="glass-panel rounded-2xl p-4">
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Book Session - {selectedCounsellor.name}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Choose duration, date, and slot for personalized mentorship.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Duration
              <select
                value={selectedDuration}
                onChange={(event) => setSelectedDuration(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
              >
                {selectedCounsellor.durations.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Date
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
              />
            </label>

            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Time Slot
              <select
                value={selectedSlot}
                onChange={(event) => setSelectedSlot(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">Select slot</option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmBooking}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Confirm Booking
            </button>
            <button
              type="button"
              onClick={() => setSelectedCounsellor(null)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>

          {bookingNotice ? (
            <p className="mt-3 rounded-lg bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
              {bookingNotice}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
