import { describe, expect, it } from "vitest";
import { extractDays } from "./investing";

function htmlWithState(daysLiteral: string): string {
  return `<html><body>
    <script type="text/javascript">if (typeof window.calendarComponentStates === 'undefined') { window.calendarComponentStates = {} }
    window.calendarComponentStates[1] = {
    days: ${daysLiteral},
    otherKey: {"nested": ["ignore", "this"]}
    }
    </script>
  </body></html>`;
}

describe("extractDays", () => {
  it("parses a minimal days array with one event", () => {
    const html = htmlWithState(
      JSON.stringify([
        {
          date: "Sun <span>Aug 30</span>",
          dateline: 1788022800,
          events: [
            {
              id: 146583,
              name: "ISM Manufacturing PMI",
              dateline: 1788271200,
              currency: "USD",
              impactName: "high",
              actual: "54.6",
              previous: "55.6",
              forecast: "55.2",
            },
          ],
        },
      ]),
    );

    const days = extractDays(html);
    expect(days).toHaveLength(1);
    expect(days[0].events).toHaveLength(1);
    expect(days[0].events?.[0]).toMatchObject({
      id: 146583,
      name: "ISM Manufacturing PMI",
      actual: "54.6",
    });
  });

  it("correctly balances brackets/braces/strings when values contain them", () => {
    const html = htmlWithState(
      JSON.stringify([
        {
          date: "Mon <span>Aug 31</span>",
          dateline: 1788109200,
          events: [
            {
              id: 1,
              name: 'Event with "quotes" and [brackets] and {braces}',
              dateline: 1788109200,
              currency: "JPY",
              impactName: "low",
              actual: "",
              previous: "",
              forecast: "",
            },
            {
              id: 2,
              name: "Second event",
              dateline: 1788112800,
              currency: "EUR",
              impactName: "medium",
            },
          ],
        },
      ]),
    );

    const days = extractDays(html);
    expect(days[0].events).toHaveLength(2);
    expect(days[0].events?.[0].name).toBe(
      'Event with "quotes" and [brackets] and {braces}',
    );
    expect(days[0].events?.[1].currency).toBe("EUR");
  });

  it("throws when calendarComponentStates marker is missing", () => {
    expect(() => extractDays("<html><body>no state here</body></html>")).toThrow();
  });

  it("throws when the days array is unterminated", () => {
    const broken = `<script>window.calendarComponentStates[1] = { days: [ { "events": [ </script>`;
    expect(() => extractDays(broken)).toThrow();
  });
});
