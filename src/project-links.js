// Single source of truth for where a project's buttons point and what they say.
// Both the portfolio card and the slideshow modal read from here, so a project
// can never be described one way in the grid and another way in the lightbox.

// What a project's `live_link` actually points at. An app you can run in the
// browser is "app"; a landing page for something you install is "marketing".
// A mobile project that also has a store listing can only be the latter.
export function getLiveLinkKind(project) {
  if (project.live_link_kind) return project.live_link_kind;
  if (project.category === 'mobile' && project.play_store_link) return 'marketing';
  return 'app';
}

// Button text for `live_link`. Projects can override it per-entry; the defaults
// make sure a marketing site is never labelled as if it were the download.
export function getLiveLinkLabel(project) {
  if (project.live_link_label) return project.live_link_label;
  if (getLiveLinkKind(project) === 'marketing') return 'Visit Website';
  if (project.category === 'mobile') return 'Get App';
  if (project.category === 'web' || project.category === 'security') return 'View Live Site';
  return 'Live Demo';
}

// Every place a project can be visited, in call-to-action order. The store
// listing leads when there is one, because installing is the real action and
// the website beside it is only there to explain the app.
export function getProjectDestinations(project) {
  if (!project) return [];
  const title = project.title || 'this project';
  const destinations = [];

  if (project.play_store_link) {
    destinations.push({
      type: 'store',
      url: project.play_store_link,
      label: 'Get it on Google Play',
      aria: `Get ${title} on Google Play (opens in a new tab)`
    });
  }

  if (project.live_link) {
    const kind = getLiveLinkKind(project);
    const label = getLiveLinkLabel(project);
    destinations.push({
      type: kind === 'marketing' ? 'site' : 'live',
      url: project.live_link,
      label,
      aria: kind === 'marketing'
        ? `Visit the ${title} website (opens in a new tab)`
        : `${label} for ${title} (opens in a new tab)`
    });
  }

  if (project.link) {
    destinations.push({
      type: 'source',
      url: project.link,
      label: 'Source Code',
      aria: `View ${title} source code on GitHub (opens in a new tab)`
    });
  }

  return destinations;
}
