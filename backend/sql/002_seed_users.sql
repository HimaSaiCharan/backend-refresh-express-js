WITH manager AS (
  INSERT INTO users (name, email, role, manager_id)
  VALUES ('Maya Patel', 'maya.patel@example.com', 'manager', NULL)
  RETURNING id
)
INSERT INTO users (name, email, role, manager_id)
SELECT employee.name, employee.email, employee.role, manager.id
FROM manager
CROSS JOIN (
  VALUES
    ('Daniel Kim', 'daniel.kim@example.com', 'employee'),
    ('Sofia Martinez', 'sofia.martinez@example.com', 'employee')
) AS employee(name, email, role);
