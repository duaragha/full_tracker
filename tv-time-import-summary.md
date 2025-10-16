# TV Time Data Import Summary

## Overview
TV Time export contains comprehensive tracking data from your viewing history.

## TV Shows Data

### Statistics
- **Total TV Shows Tracked**: 135 shows
- **Currently Followed**: 117 shows
- **Total Episodes Watched**: 8,799 episodes

### Top 30 Shows by Episode Count
1. Pokémon - 658 episodes
2. Friends - 470 episodes
3. Naruto Shippuden - 451 episodes
4. Once Upon a Time (2011) - 390 episodes
5. Full House - 383 episodes
6. The Big Bang Theory - 279 episodes
7. The Flash (2014) - 272 episodes
8. The Office (US) - 266 episodes
9. Modern Family - 251 episodes
10. How I Met Your Mother - 238 episodes
11. Naruto - 223 episodes
12. The Walking Dead - 203 episodes
13. Boruto: Naruto Next Generations - 199 episodes
14. Seinfeld - 196 episodes
15. Manifest - 173 episodes
16. The Vampire Diaries - 171 episodes
17. Arrow - 170 episodes
18. Lucifer - 169 episodes
19. Young Sheldon - 151 episodes
20. The 100 - 148 episodes
21. DC's Legends of Tomorrow - 148 episodes
22. Brooklyn Nine-Nine - 142 episodes
23. 2 Broke Girls - 138 episodes
24. Fuller House - 132 episodes
25. Parks and Recreation - 123 episodes
26. Fresh Off the Boat - 116 episodes
27. Superstore - 112 episodes
28. iCarly - 109 episodes
29. The Rookie - 106 episodes
30. The Suite Life on Deck - 101 episodes

### Data Sources
- **followed_tv_show.csv**: Contains show names, IDs, follow status
- **user_tv_show_data.csv**: Contains episode counts and watch status
- **tracking-prod-records-v2.csv**: Contains detailed episode-by-episode tracking with timestamps

### Available Fields
- Show name
- TV Time internal ID
- Number of episodes seen
- Follow status (active/archived)
- Favorite status
- Notification preferences

## Movies Data

### Statistics
- **Total Movies Watched**: 71 unique movies

### Challenge: Movie Titles Not Included
**PROBLEM**: TV Time export only includes UUIDs for movies, not actual movie titles.

Example movie entries:
- `a21c6cd1-0c0c-4fd9-85aa-53a19388ef31` - watched 2019-12-10
- `d490dcd0-53a8-4ff4-a63a-f98449a99265` - watched 2019-12-10
- `9f0a6d9b-45e5-4514-871a-3e1775f0e42b` - watched 2019-12-10

### Data Sources
- **wm_uc_catalog.datalake.datalake_normalized_user_action_view.csv**: Contains movie watch events with UUIDs and timestamps

### Available Fields
- TV Time movie UUID (internal identifier)
- Watch timestamp
- View type (movie-watch)
- View number (rewatches)
- User metadata (country, age, gender)

## Resolution Strategy for Movies

### Option 1: Manual Lookup
Manually search for each UUID on TV Time's website or database to find titles.

### Option 2: Third-Party Tools
Use community-built tools like:
- TV Time export parsers (GitHub repositories)
- TV Time to Trakt sync tools (may have UUID mappings)

### Option 3: TMDB/API Lookup
If TV Time UUIDs map to external IDs:
- Check if UUIDs correlate to TMDB IDs
- Use TMDB API to fetch movie details
- Cross-reference with watch dates

### Option 4: Web Scraping
Access TV Time profile page and scrape movie watch history (requires login).

## Import Strategy

### TV Shows (Ready to Import)
1. Parse `user_tv_show_data.csv` for complete show list
2. Extract: name, episode count, follow status
3. Map to tracker database schema
4. Import with status based on follow status

### Movies (Requires Resolution)
1. Extract all movie UUIDs and watch dates
2. Resolve UUIDs to movie titles using one of the strategies above
3. Map to tracker database schema
4. Import with watch dates

## File Structure
```
tv-time-personal-data/
├── followed_tv_show.csv (117 shows)
├── user_tv_show_data.csv (135 shows with episode counts)
├── tracking-prod-records-v2.csv (4.5M - detailed episode tracking)
├── wm_uc_catalog.datalake.datalake_normalized_user_action_view.csv (2.2M - all viewing data)
└── [60+ other metadata files]
```

## Next Steps
1. ✅ Complete data analysis
2. Extract TV show data to importable format
3. Research movie UUID resolution methods
4. Create TV show import script
5. Create movie import script (once titles resolved)
