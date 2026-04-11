-- Append Storage Bucket setup for QR Codes
insert into storage.buckets (id, name, public) 
values ('qrcodes', 'qrcodes', true) 
on conflict (id) do nothing;

drop policy if exists "Allow public viewing" on storage.objects;
create policy "Allow public viewing" on storage.objects for select using ( bucket_id = 'qrcodes' );

drop policy if exists "Allow authenticated uploads" on storage.objects;
create policy "Allow authenticated uploads" on storage.objects for insert with check ( bucket_id = 'qrcodes' AND auth.role() = 'authenticated' );
