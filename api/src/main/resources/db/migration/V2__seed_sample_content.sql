-- SAMPLE CONTENT. Amber & Pea Law is a fictional firm created for a portfolio project.
-- All names, attorneys, reviews and details below are invented.

INSERT INTO practice_area (slug, name, summary, description, sort_order) VALUES
('car-accidents', 'Car Accidents',
 'Help after a collision, from dealing with insurers to recovering medical costs and lost wages.',
 'After a car accident you may be facing medical bills, vehicle repairs, missed work and calls from insurance adjusters. Our personal injury team reviews police reports, medical records and insurance policies, explains your options in plain language, and handles communication with insurers so you can focus on recovery. Every case is different and no outcome can be guaranteed; a free consultation is the best way to understand your situation. (Sample content.)',
 10),
('slip-and-fall', 'Slip and Fall / Premises Liability',
 'Injuries caused by unsafe property conditions such as wet floors, broken stairs or poor lighting.',
 'Property owners have duties to keep their premises reasonably safe. If you were hurt because of a hazard on someone else''s property, evidence such as photos, incident reports and witness details can matter. We can walk you through what information to gather and what deadlines may apply. (Sample content.)',
 20),
('workplace-injuries', 'Workplace Injuries',
 'Guidance on injuries suffered on the job, including workers'' compensation and third-party claims.',
 'Workplace injuries can involve workers'' compensation and, in some cases, claims against third parties such as equipment manufacturers or contractors. We help you understand the process, the paperwork and the timelines involved. (Sample content.)',
 30),
('divorce', 'Divorce',
 'Support through contested and uncontested divorce, property division and spousal support.',
 'Divorce affects your finances, your home and your family. Our family law team helps with uncontested and contested divorces, division of property and debts, and spousal support questions, with an emphasis on clear communication and respectful resolution where possible. (Sample content.)',
 40),
('child-custody', 'Child Custody',
 'Parenting plans, custody arrangements and modifications focused on the best interests of the child.',
 'Custody matters are among the most important decisions a family can face. We help parents prepare parenting plans, negotiate custody and visitation arrangements, and seek modifications when circumstances change. (Sample content.)',
 50),
('child-support', 'Child Support',
 'Establishing, reviewing and modifying child support orders.',
 'Child support is generally calculated using state guidelines, but the details matter. We help with establishing support, reviewing existing orders and requesting modifications after significant changes in income or custody. (Sample content.)',
 60);

INSERT INTO attorney (slug, full_name, title, short_bio, bio, education, bar_admissions, sort_order) VALUES
('amber-calloway', 'Amber Calloway', 'Founding Partner, Personal Injury',
 'Amber has focused on personal injury matters for over 15 years and leads the firm''s injury practice.',
 'Amber Calloway co-founded Amber & Pea Law with a simple goal: make the legal process understandable for people going through a difficult time. She focuses on car accident and premises liability matters and is known for keeping clients informed at every step. Outside the office she volunteers with local road safety programs. (Sample profile. This attorney is fictional.)',
 'J.D., Sample State University School of Law; B.A., Example College',
 'Admitted to practice in the State of Example (sample)',
 10),
('desmond-pea', 'Desmond Pea', 'Founding Partner, Family Law',
 'Desmond leads the family law practice, handling divorce, custody and support matters.',
 'Desmond Pea has guided families through divorce, custody and support matters for more than a decade. He believes in practical, child-focused solutions and is trained in mediation. He co-founded the firm to offer family law services with clear fees and honest expectations. (Sample profile. This attorney is fictional.)',
 'J.D., Example University College of Law; B.S., Sample State University',
 'Admitted to practice in the State of Example (sample)',
 20),
('priya-natarajan', 'Priya Natarajan', 'Associate Attorney',
 'Priya works across personal injury and family law, with a focus on workplace injuries and child support.',
 'Priya Natarajan joined the firm after clerking for a trial court judge. She works with clients on workplace injury claims and child support matters, and she is fluent in English and Tamil. (Sample profile. This attorney is fictional.)',
 'J.D., Example School of Law; B.A., Sample University',
 'Admitted to practice in the State of Example (sample)',
 30);

INSERT INTO attorney_practice_area (attorney_id, practice_area_id)
SELECT a.id, p.id FROM attorney a JOIN practice_area p ON
    (a.slug = 'amber-calloway'  AND p.slug IN ('car-accidents', 'slip-and-fall', 'workplace-injuries')) OR
    (a.slug = 'desmond-pea'     AND p.slug IN ('divorce', 'child-custody', 'child-support')) OR
    (a.slug = 'priya-natarajan' AND p.slug IN ('workplace-injuries', 'child-support', 'car-accidents'));

INSERT INTO review (author_name, rating, content, practice_area_id, review_date)
SELECT v.author_name, v.rating, v.content, p.id, v.review_date::date
FROM (VALUES
    ('Jordan M.', 5, 'Amber explained every step after my car accident and always returned my calls quickly. I never felt lost in the process. (Sample review.)', 'car-accidents', '2026-06-12'),
    ('Taylor R.', 5, 'Desmond helped us reach a parenting plan that actually works for our kids. Calm, practical and kind. (Sample review.)', 'child-custody', '2026-05-28'),
    ('Casey L.', 4, 'Clear about fees from the first meeting. The free consultation answered most of my questions. (Sample review.)', 'divorce', '2026-04-03'),
    ('Morgan P.', 5, 'Priya was patient with all my questions about my workplace injury claim and kept the paperwork moving. (Sample review.)', 'workplace-injuries', '2026-03-19'),
    ('Riley S.', 5, 'Friendly staff, easy scheduling and honest expectations. I would recommend them to friends. (Sample review.)', 'slip-and-fall', '2026-02-07'),
    ('Avery K.', 4, 'Helpful guidance on modifying our child support order. Good communication throughout. (Sample review.)', 'child-support', '2026-01-22')
) AS v(author_name, rating, content, slug, review_date)
JOIN practice_area p ON p.slug = v.slug;
