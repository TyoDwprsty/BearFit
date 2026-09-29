-- Bigger built-in catalog for "Tambah manual". The values are the "experienced" dose;
-- the app scales them down (total beginner) or up (pro), see lib/workout-dose.ts.

insert into public.exercises (slug, name_id, name_en, category, intensity, sets, reps, duration_sec, minutes) values
  -- Sport
  ('padel',             'Padel',                     'Padel',                'sport',       'medium', null, null, null, 60),
  ('tennis',            'Tenis',                     'Tennis',               'sport',       'hard',   null, null, null, 60),
  ('badminton',         'Bulu tangkis',              'Badminton',            'sport',       'medium', null, null, null, 60),
  ('table-tennis',      'Tenis meja',                'Table tennis',         'sport',       'light',  null, null, null, 45),
  ('futsal',            'Futsal',                    'Futsal',               'sport',       'hard',   null, null, null, 60),
  ('football',          'Sepak bola',                'Football',             'sport',       'hard',   null, null, null, 90),
  ('basketball',        'Basket',                    'Basketball',           'sport',       'hard',   null, null, null, 60),
  ('volleyball',        'Voli',                      'Volleyball',           'sport',       'medium', null, null, null, 60),
  ('swimming',          'Renang',                    'Swimming',             'sport',       'medium', null, null, null, 45),
  ('boxing',            'Tinju',                     'Boxing',               'sport',       'hard',   null, null, null, 45),
  ('martial-arts',      'Bela diri',                 'Martial arts',         'sport',       'hard',   null, null, null, 60),
  ('climbing',          'Panjat tebing',             'Climbing',             'sport',       'hard',   null, null, null, 60),
  ('golf',              'Golf',                      'Golf',                 'sport',       'light',  null, null, null, 120),
  -- Cardio
  ('running',           'Lari',                      'Running',              'cardio',      'hard',   null, null, null, 30),
  ('hiking',            'Mendaki',                   'Hiking',               'cardio',      'medium', null, null, null, 90),
  ('dance-workout',     'Dance / zumba',             'Dance workout',        'cardio',      'medium', null, null, null, 45),
  ('hiit',              'HIIT',                      'HIIT',                 'cardio',      'hard',   null, null, null, 20),
  ('indoor-cycling',    'Sepeda statis',             'Indoor cycling',       'cardio',      'hard',   null, null, null, 45),
  ('stair-climb',       'Naik-turun tangga',         'Stair climbing',       'cardio',      'medium', null, null, null, 15),
  ('burpee',            'Burpee',                    'Burpees',              'cardio',      'hard',   3,    10,   null, 6),
  ('mountain-climber',  'Mountain climber',          'Mountain climbers',    'cardio',      'hard',   3,    null, 30,   4),
  -- Strength
  ('pushup',            'Push-up',                   'Push-up',              'strength',    'medium', 3,    12,   null, 6),
  ('pullup',            'Pull-up',                   'Pull-up',              'strength',    'hard',   3,    6,    null, 6),
  ('crunch',            'Crunch',                    'Crunches',             'strength',    'light',  3,    15,   null, 5),
  ('calf-raise',        'Calf raise',                'Calf raise',           'strength',    'light',  3,    15,   null, 4),
  ('dumbbell-row',      'Dumbbell row',              'Dumbbell row',         'strength',    'medium', 3,    10,   null, 8),
  ('shoulder-press',    'Shoulder press',            'Shoulder press',       'strength',    'medium', 3,    10,   null, 8),
  ('deadlift',          'Deadlift',                  'Deadlift',             'strength',    'hard',   4,    8,    null, 12),
  ('side-plank',        'Side plank',                'Side plank',           'strength',    'medium', 3,    null, 30,   4),
  ('wall-sit',          'Wall sit',                  'Wall sit',             'strength',    'medium', 3,    null, 45,   4),
  ('gym-session',       'Latihan beban di gym',      'Gym weight training',  'strength',    'medium', null, null, null, 60),
  -- Relaxing (the "flexibility" category)
  ('yoga',              'Yoga',                      'Yoga',                 'flexibility', 'medium', null, null, null, 45),
  ('pilates',           'Pilates',                   'Pilates',              'flexibility', 'medium', null, null, null, 45),
  ('tai-chi',           'Tai chi',                   'Tai chi',              'flexibility', 'light',  null, null, null, 30),
  ('full-body-stretch', 'Stretching seluruh badan',  'Full-body stretch',    'flexibility', 'light',  null, null, null, 15),
  ('foam-rolling',      'Foam rolling',              'Foam rolling',         'flexibility', 'light',  null, null, null, 10),
  ('leisure-walk',      'Jalan santai',              'Leisure walk',         'flexibility', 'light',  null, null, null, 30),
  ('meditation',        'Meditasi',                  'Meditation',           'flexibility', 'light',  null, null, null, 10),
  ('breathing',         'Latihan napas',             'Breathing exercise',   'flexibility', 'light',  null, null, null, 5)
on conflict (slug) do nothing;
