# Peak away app

Build a premium, production-quality web application called "CrowdSense India".

It is an India-wide crowd intelligence and location discovery platform.

CORE IDEA:

Users can search for ANY place/address in India, view it on an interactive map, see its current estimated crowd level, and submit a crowd report.

The application must feel like a polished startup product suitable for a major hackathon demonstration.

TECHNOLOGY:

- React

- TypeScript

- Tailwind CSS

- Leaflet for maps

- Supabase for database/backend

- Responsive mobile-first design

- Component-based architecture

MAP:

- Full interactive Leaflet map

- India should be the initial map region

- Show place markers

- Markers should visually indicate crowd level

- Clicking a marker opens a rich place card

- Users can click anywhere on the map to select a location

- Provide "Use My Location"

- Reverse-geocode selected coordinates into a readable address

- Allow users to move/change their selected pin

- Allow searching for addresses throughout India

SEARCH:

Create a prominent search bar.

Users should be able to search:

- addresses

- landmarks

- colleges

- hospitals

- railway stations

- bus stands

- shopping areas

- restaurants

- tourist locations

- cities

- towns

- villages

- localities

Use geocoding rather than hard-coded Indian addresses.

CROWD REPORTING:

Users should be able to report:

- Quiet

- Moderate

- Busy

- Very Busy

Show:

- number of recent reports

- latest report time

- crowd confidence

- trend

- report freshness

Use recency-weighted scoring so recent reports have more influence than old reports.

PLACE DETAILS:

When a location is selected, show:

- place name

- full address

- crowd level

- confidence

- recent reports

- last updated time

- map position

- report button

- directions button

PLAN MY DAY:

Create a feature where the user can enter multiple places and the application ranks them according to:

- crowd level

- freshness of information

- distance

- user preference

DESIGN:

Make the interface extremely polished.

Use:

- dark premium theme

- glassmorphism

- subtle gradients

- rounded cards

- smooth animations

- excellent typography

- elegant icons

- polished hover states

- animated map markers

- beautiful loading states

- empty states

- error states

- responsive mobile navigation

The result should NOT look like a generic AI-generated dashboard.

It should look like a real startup product.

Create a beautiful landing/header area, interactive map, search experience, place details panel, crowd reporting UI and Plan My Day experience.

Prioritize usability and visual hierarchy.

Do not use fake buttons that don't work.

Every major interaction should actually function.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://peakawayy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e46acdb0-0827-4331-9714-157783550f43).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
