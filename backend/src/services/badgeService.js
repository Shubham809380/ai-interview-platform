function isSameDay(a, b) {
  if (!a || !b) {
    return false;
  }

  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function isNextDay(previous, current) {
  if (!previous || !current) {
    return false;
  }

  const start = Date.UTC(previous.getUTCFullYear(), previous.getUTCMonth(), previous.getUTCDate());
  const end = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate());
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

function addBadge(user, badge, awarded) {
  if (!user.badges.includes(badge)) {
    user.badges.push(badge);
    awarded.push(badge);
  }
}

function applyGamification({ user, sessionScore, completedSessions }) {
  const awarded = [];
  const now = new Date();

  let pointsEarned = 20 + Math.round(sessionScore / 5);
  if (sessionScore >= 85) {
    pointsEarned += 10;
  }

  user.points += pointsEarned;

  if (!user.lastPracticeDate) {
    user.streak = 1;
  } else if (isSameDay(user.lastPracticeDate, now)) {
    user.streak = user.streak || 1;
  } else if (isNextDay(new Date(user.lastPracticeDate), now)) {
    user.streak = (user.streak || 0) + 1;
  } else {
    user.streak = 1;
  }

  user.lastPracticeDate = now;

  if (completedSessions === 1) {
    addBadge(user, "First Mock", awarded);
  }

  if (sessionScore >= 80) {
    addBadge(user, "Sharp Speaker", awarded);
  }

  if (sessionScore >= 90) {
    addBadge(user, "Interview Ace", awarded);
  }

  if (user.streak >= 3) {
    addBadge(user, "Consistency Streak", awarded);
  }

  if (completedSessions >= 10) {
    addBadge(user, "Interview Athlete", awarded);
  }

  return {
    pointsEarned,
    totalPoints: user.points,
    streak: user.streak,
    awardedBadges: awarded
  };
}

module.exports = { applyGamification };
