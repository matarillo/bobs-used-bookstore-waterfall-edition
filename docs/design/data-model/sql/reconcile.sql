-- Zero rows is the expected result; one statement/snapshot.
SET search_path = bookstore, public;
SELECT issue, entity FROM v_model_issues ORDER BY issue, entity;
