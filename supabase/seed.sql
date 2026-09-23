insert into public.packs (id, owner_id, name, share_code, is_public)
values ('00000000-0000-0000-0000-000000000001', null, 'Starter Deck', 'STARTER', true)
on conflict (share_code) do nothing;

insert into public.spectrums (pack_id, left_label, right_label)
select '00000000-0000-0000-0000-000000000001', l, r
from (values
  ('Cold', 'Hot'),
  ('Underrated', 'Overrated'),
  ('Bad villain', 'Good villain'),
  ('Boring', 'Exciting'),
  ('Cheap', 'Expensive'),
  ('Safe', 'Dangerous'),
  ('Quiet', 'Loud'),
  ('Small talk topic', 'First date topic'),
  ('Would never try it', 'Would try it right now'),
  ('Bad superpower', 'Great superpower'),
  ('Comfort food', 'Fancy food'),
  ('Low effort costume', 'High effort costume'),
  ('Should be a crime', 'Totally fine'),
  ('Instantly forgettable', 'Never forget it'),
  ('Bad first date', 'Great first date'),
  ('Overhyped movie', 'Underhyped movie'),
  ('Kid activity', 'Adult activity'),
  ('Bad roommate habit', 'Fine roommate habit'),
  ('Would not survive a day', 'Could live there forever'),
  ('Guilty pleasure', 'No shame at all'),
  ('Too soon for a joke', 'Always fair game'),
  ('Bad gift', 'Great gift'),
  ('Overrated vacation spot', 'Underrated vacation spot'),
  ('Petty', 'Justified'),
  ('Basic', 'Unique'),
  ('Bad life advice', 'Good life advice'),
  ('Should stay a secret', 'Should be public knowledge'),
  ('Not a real sport', 'Definitely a real sport'),
  ('Waste of money', 'Worth every penny'),
  ('Red flag', 'Green flag'),
  ('Bad karaoke song', 'Great karaoke song'),
  ('Too weird', 'Perfectly normal'),
  ('Should retire it', 'Timeless classic'),
  ('Bad party game', 'Great party game'),
  ('Niche interest', 'Mainstream obsession'),
  ('Bad excuse', 'Solid excuse'),
  ('Skip it', 'Must-see'),
  ('Overpacked suitcase item', 'Essential suitcase item'),
  ('Bad pet name', 'Great pet name'),
  ('Too much information', 'Totally shareable')
) as t(l, r)
where not exists (
  select 1 from public.spectrums s
  where s.pack_id = '00000000-0000-0000-0000-000000000001' and s.left_label = t.l and s.right_label = t.r
);
