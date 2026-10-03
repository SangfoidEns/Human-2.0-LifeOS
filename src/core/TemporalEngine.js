/**
 * LifeOS Core 2031 · TemporalEngine
 * Adaptive Temporal Elasticity Engine.
 * Fixed meetings act as gravitational centers.
 * Tasks / chores are elastic buffers that compress or expand
 * according to current biomechanical strain.
 */

export class TemporalEngine {
  constructor(options = {}) {
    this.dayStartHour = options.dayStartHour ?? 8;
    this.dayEndHour = options.dayEndHour ?? 23;
    this.meetings = options.meetings ?? [
      { time: '11:00', title: 'Синхронізація' },
      { time: '14:30', title: 'Командний вузол' },
      { time: '18:00', title: 'Рев\'ю' }
    ];
    this.strain = 3;
  }

  setStrain(level) {
    this.strain = Math.max(1, Math.min(10, level));
  }

  setMeetings(list) {
    this.meetings = list;
  }

  /** Parse "HH:MM" into today's timestamp */
  meetTimestamp(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }

  /** Minutes until next future meeting (or 999 if none) */
  minutesToNextMeeting(now = Date.now()) {
    const future = this.meetings
      .map((m) => this.meetTimestamp(m.time))
      .filter((t) => t > now)
      .sort((a, b) => a - b);

    if (!future.length) return 999;
    return (future[0] - now) / 60000;
  }

  /** True if a given end-timestamp overlaps any future meeting */
  hasCollision(endTimestamp, now = Date.now()) {
    if (!endTimestamp) return false;
    return this.meetings.some((m) => {
      const t = this.meetTimestamp(m.time);
      return t > now && t < endTimestamp;
    });
  }

  /**
   * Build the elastic day segments (08 → 22)
   * Returns array of { hour, state, flex }
   * state: 'past' | 'now' | 'gravity' | 'buffer' | 'normal'
   * flex: relative width factor (compressed / expanded under high strain)
   */
  buildWave(now = new Date()) {
    const currentHour = now.getHours();
    const highStrain = this.strain >= 6;
    const segments = [];

    for (let h = this.dayStartHour; h <= this.dayEndHour - 1; h++) {
      let state = 'normal';
      let flex = 1;

      if (h < currentHour) state = 'past';
      else if (h === currentHour) state = 'now';

      const isMeeting = this.meetings.some(
        (m) => parseInt(m.time, 10) === h
      );
      if (isMeeting) state = 'gravity';

      // soft recovery buffers
      if ([9, 12, 16, 20].includes(h) && state === 'normal') {
        state = 'buffer';
      }

      // Temporal Elasticity rules
      if (highStrain) {
        // compress typical chore windows
        if ([10, 13, 15, 17, 21].includes(h)) {
          flex = 0.38;
        }
        // expand gravity wells and current hour
        if (
          [11, 14, 18, 19].includes(h) ||
          h === currentHour ||
          isMeeting
        ) {
          flex = 1.75;
        }
      }

      segments.push({ hour: h, state, flex });
    }

    return segments;
  }

  /**
   * Position of the "now" scan beam as percentage 0–100
   */
  scanPosition(now = new Date()) {
    const totalMinutes =
      (this.dayEndHour - this.dayStartHour) * 60;
    const currentMinutes =
      (now.getHours() - this.dayStartHour) * 60 + now.getMinutes();

    return Math.max(0, Math.min(100, (currentMinutes / totalMinutes) * 100));
  }

  /**
   * Suggest whether a new timed activity of `durationMin` minutes
   * would collide with a gravitational center.
   */
  validateDuration(durationMin, now = Date.now()) {
    const end = now + durationMin * 60 * 1000;
    return {
      end,
      collision: this.hasCollision(end, now),
      minutesToNext: this.minutesToNextMeeting(now)
    };
  }
}

export const temporal = new TemporalEngine();
