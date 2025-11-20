-- Seed demo data for development
-- Password for all demo users: "demo123"
-- Hash generated with bcrypt, rounds=10

-- Insert demo users
INSERT INTO users (id, email, password_hash, display_name, role) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'olivia@exhibitcontrol.com', '$2b$10$rKZLvVZ9h0bGJxW8QqKvVe7nQXH2bJ5YzqGKqLFxCfhQQ0QQqLFxC', 'Olivia Owner', 'owner'),
('550e8400-e29b-41d4-a716-446655440002', 'samuel@exhibitcontrol.com', '$2b$10$rKZLvVZ9h0bGJxW8QqKvVe7nQXH2bJ5YzqGKqLFxCfhQQ0QQqLFxC', 'Samuel Staff', 'staff'),
('550e8400-e29b-41d4-a716-446655440003', 'skyler@exhibitcontrol.com', '$2b$10$rKZLvVZ9h0bGJxW8QqKvVe7nQXH2bJ5YzqGKqLFxCfhQQ0QQqLFxC', 'Skyler Staff', 'staff'),
('550e8400-e29b-41d4-a716-446655440004', 'cameron@client.com', '$2b$10$rKZLvVZ9h0bGJxW8QqKvVe7nQXH2bJ5YzqGKqLFxCfhQQ0QQqLFxC', 'Cameron Client', 'client'),
('550e8400-e29b-41d4-a716-446655440005', 'callie@client.com', '$2b$10$rKZLvVZ9h0bGJxW8QqKvVe7nQXH2bJ5YzqGKqLFxCfhQQ0QQqLFxC', 'Callie Client', 'client');

-- Insert demo projects
INSERT INTO projects (id, name, show, size, move_in_date, opening_day, description, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Flagship Exhibit Launch', 'Tech Summit 2024', '30x40 ft', '2024-09-15', '2024-09-18', 'Main trade show build for Q3.', '2024-03-01 00:00:00+00'),
('650e8400-e29b-41d4-a716-446655440002', 'Regional Pop-up Booth', 'Healthcare Expo 2024', '10x10 ft', '2024-10-01', '2024-10-03', 'Portable booth concept for regional tour.', '2024-04-05 00:00:00+00');

-- Insert project members
INSERT INTO project_members (project_id, user_id, role) VALUES
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'owner'),
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'staff'),
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'client'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'owner'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'staff'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'client');

-- Insert default templates
INSERT INTO templates (id, name, description, stages, stage_count, is_default) VALUES
(
    '750e8400-e29b-41d4-a716-446655440001',
    'Standard Project Template',
    'Comprehensive 5-stage workflow for full-scale exhibits',
    '[{"slug":"planning","name":"Planning","description":"Project kickoff and planning phase","defaultStageDueInDays":7},{"slug":"production","name":"Production","description":"Build and fabrication phase","defaultStageDueInDays":30},{"slug":"shipping","name":"Shipping","description":"Logistics and transportation","defaultStageDueInDays":5},{"slug":"installation","name":"Installation","description":"On-site setup and installation","defaultStageDueInDays":3},{"slug":"closeout","name":"Closeout","description":"Final walkthrough and project completion","defaultStageDueInDays":2}]'::jsonb,
    5,
    true
),
(
    '750e8400-e29b-41d4-a716-446655440002',
    'Quick Setup Template',
    'Streamlined 3-stage workflow for smaller projects',
    '[{"slug":"preparation","name":"Preparation","description":"Planning and prep work","defaultStageDueInDays":5},{"slug":"execution","name":"Execution","description":"Build and delivery","defaultStageDueInDays":14},{"slug":"completion","name":"Completion","description":"Installation and final review","defaultStageDueInDays":3}]'::jsonb,
    3,
    false
);
