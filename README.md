# Perfect Clear Setup Database

![GitHub contributors](https://img.shields.io/github/contributors/Marfung37/pc-database)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Marfung37/pc-database)
![Number of Setups](https://img.shields.io/badge/setups-4284-green?style=flat)
[![Website Link](https://img.shields.io/badge/visit-website-blue)](https://pc-database.vercel.app/)

## Description

Tetris Perfect Clears (PCs) are a concept focusing on clearing all lines on a board, which some background can be found in "[Introduction to PC Theory](https://docs.google.com/document/d/1udtq235q2SdoFYwMZNu-GRYR-4dCYMkp0E8_Hw1XTyg/edit?usp=sharing)".
Setups have a variety of information regarding usage, types, solves, statistics, etc that do not have a centralized location where it is stored.
The main previous source of this data was in Hstert's [konbini](https://docs.google.com/spreadsheets/d/1utU86mHLcXu7KjyiMjYPNkEG_CthO-bfY0Pk7jOOH_E/edit?usp=sharing), containing a lot of setup data, but there are limitations in usage of google sheets to store data, especially the lack of ability to use this data in other projects.

This project aims to have a database for setups used in PCs along with a website that showcases usage of this information mainly for finding a setup.
The database uses the cloud service [supabase](https://supabase.com/), which allows public access to the database, which currently is read-only publicly.
More information regarding accessing this data can be found in [database usage](#database-usage).
In the repo, `utils` consists of a variety of scripts for populating statistics columns in the database.
The website uses Sveltekit and currently all the UI elements are implemented within the project.

## Database Usage

The database is publicly read-only and the credentials to access the database is shown below.

Supabase Url: `https://xlixeudymsirbbbdgjwm.supabase.co`  
Anon Key:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXhldWR5bXNpcmJiYmRnandtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMjg5ODAsImV4cCI6MjA2MjkwNDk4MH0.RN0e2eGnRuO9WwpZMdPxvh5dH8jZ0CkzH-vqvV9XcYo
```

To use these to query the database, supabase has documentation regarding using their API in various languages at [https://supabase.com/docs/reference](https://supabase.com/docs/reference).
