
-- Smart mention suggestions function that ranks users by relationship and interaction
CREATE OR REPLACE FUNCTION public.get_mention_suggestions(
  p_user_id uuid,
  p_query text DEFAULT '',
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  username text,
  score numeric,
  match_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query text := lower(trim(p_query));
  v_is_short_query boolean := (length(v_query) < 2);
  v_network_limit int := CASE WHEN v_is_short_query THEN p_limit ELSE p_limit / 2 END;
  v_global_limit int := p_limit - v_network_limit;
BEGIN
  RETURN QUERY
  WITH 
  -- Get follow relationships
  my_following AS (
    SELECT following_id AS uid FROM user_follows WHERE follower_id = p_user_id
  ),
  my_followers AS (
    SELECT follower_id AS uid FROM user_follows WHERE following_id = p_user_id
  ),
  network_users AS (
    SELECT uid FROM my_following
    UNION
    SELECT uid FROM my_followers
  ),
  -- DM interaction scores
  dm_scores AS (
    SELECT 
      CASE WHEN m.sender_id = p_user_id THEN other_p.user_id ELSE m.sender_id END AS uid,
      COUNT(*) AS msg_count,
      MAX(m.created_at) AS last_interaction
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    CROSS JOIN LATERAL (
      SELECT unnest(c.participant_ids) AS user_id
    ) other_p
    WHERE p_user_id = ANY(c.participant_ids)
      AND other_p.user_id != p_user_id
      AND (m.sender_id = p_user_id OR other_p.user_id = m.sender_id)
    GROUP BY 1
  ),
  -- Comment interaction scores (users who commented on my posts or I on theirs)
  comment_scores AS (
    SELECT other_user_id AS uid, COUNT(*) AS comment_count, MAX(ts) AS last_interaction
    FROM (
      -- Others commenting on my posts
      SELECT pc.user_id AS other_user_id, pc.created_at AS ts
      FROM post_comments pc
      JOIN posts p ON p.id = pc.post_id
      WHERE p.user_id = p_user_id AND pc.user_id != p_user_id
      UNION ALL
      -- Me commenting on others' posts
      SELECT p.user_id AS other_user_id, pc.created_at AS ts
      FROM post_comments pc
      JOIN posts p ON p.id = pc.post_id
      WHERE pc.user_id = p_user_id AND p.user_id != p_user_id
    ) sub
    GROUP BY other_user_id
  ),
  -- Care request interaction scores
  care_scores AS (
    SELECT uid, SUM(pts) AS care_pts, MAX(ts) AS last_interaction
    FROM (
      -- Assigned sitters on my requests
      SELECT cr.assigned_sitter_id AS uid, 10::numeric AS pts, cr.updated_at AS ts
      FROM care_requests cr
      WHERE cr.owner_id = p_user_id AND cr.assigned_sitter_id IS NOT NULL
      UNION ALL
      -- I was assigned to their requests
      SELECT cr.owner_id AS uid, 10::numeric AS pts, cr.updated_at AS ts
      FROM care_requests cr
      WHERE cr.assigned_sitter_id = p_user_id
      UNION ALL
      -- Applicants on my requests
      SELECT ca.applicant_id AS uid, 2::numeric AS pts, ca.updated_at AS ts
      FROM care_applications ca
      JOIN care_requests cr ON cr.id = ca.request_id
      WHERE cr.owner_id = p_user_id
      UNION ALL
      -- My applications on their requests
      SELECT cr.owner_id AS uid, 2::numeric AS pts, ca.updated_at AS ts
      FROM care_applications ca
      JOIN care_requests cr ON cr.id = ca.request_id
      WHERE ca.applicant_id = p_user_id
    ) sub
    WHERE uid IS NOT NULL AND uid != p_user_id
    GROUP BY uid
  ),
  -- Compute total scores
  all_scores AS (
    SELECT 
      p.user_id AS uid,
      p.display_name,
      p.avatar_url,
      p.username,
      COALESCE(ds.msg_count, 0) * 3 
        + COALESCE(cs.comment_count, 0) * 3 
        + COALESCE(cars.care_pts, 0)
        + CASE WHEN nu.uid IS NOT NULL THEN 5 ELSE 0 END AS base_score,
      GREATEST(
        COALESCE(ds.last_interaction, '1970-01-01'::timestamptz),
        COALESCE(cs.last_interaction, '1970-01-01'::timestamptz),
        COALESCE(cars.last_interaction, '1970-01-01'::timestamptz)
      ) AS last_interaction,
      nu.uid IS NOT NULL AS is_network
    FROM profiles p
    LEFT JOIN network_users nu ON nu.uid = p.user_id
    LEFT JOIN dm_scores ds ON ds.uid = p.user_id
    LEFT JOIN comment_scores cs ON cs.uid = p.user_id
    LEFT JOIN care_scores cars ON cars.uid = p.user_id
    WHERE p.user_id != p_user_id
      AND p.username IS NOT NULL
  ),
  scored AS (
    SELECT 
      a.*,
      a.base_score * CASE 
        WHEN a.last_interaction > now() - interval '7 days' THEN 2.0
        WHEN a.last_interaction > now() - interval '30 days' THEN 1.5
        ELSE 1.0
      END AS final_score
    FROM all_scores a
  ),
  -- Network results (followers/following + high interaction)
  network_results AS (
    SELECT uid, display_name, avatar_url, username, final_score, 'network'::text AS match_type
    FROM scored
    WHERE is_network = true
      AND (v_query = '' OR username ILIKE '%' || v_query || '%' OR display_name ILIKE '%' || v_query || '%')
    ORDER BY 
      CASE WHEN username ILIKE v_query || '%' THEN 0 ELSE 1 END,
      final_score DESC,
      username ASC
    LIMIT v_network_limit
  ),
  -- Global results (only if query >= 2 chars)
  global_results AS (
    SELECT uid, display_name, avatar_url, username, final_score, 'global'::text AS match_type
    FROM scored
    WHERE NOT v_is_short_query
      AND is_network = false
      AND (username ILIKE '%' || v_query || '%' OR display_name ILIKE '%' || v_query || '%')
      AND uid NOT IN (SELECT nr.uid FROM network_results nr)
    ORDER BY
      CASE WHEN username ILIKE v_query || '%' THEN 0 ELSE 1 END,
      final_score DESC,
      username ASC
    LIMIT v_global_limit
  )
  -- Combine: network first, then global
  SELECT nr.uid, nr.display_name, nr.avatar_url, nr.username, nr.final_score, nr.match_type
  FROM network_results nr
  UNION ALL
  SELECT gr.uid, gr.display_name, gr.avatar_url, gr.username, gr.final_score, gr.match_type
  FROM global_results gr;
END;
$$;

-- Also create a function for share suggestions (ranked by recent DMs + interactions)
CREATE OR REPLACE FUNCTION public.get_share_suggestions(
  p_user_id uuid,
  p_query text DEFAULT '',
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  username text,
  score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query text := lower(trim(p_query));
BEGIN
  RETURN QUERY
  WITH 
  -- Recent DM partners ranked by recency and volume
  dm_partners AS (
    SELECT 
      other_p.user_id AS uid,
      COUNT(*) AS msg_count,
      MAX(m.created_at) AS last_msg
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    CROSS JOIN LATERAL (
      SELECT unnest(c.participant_ids) AS user_id
    ) other_p
    WHERE p_user_id = ANY(c.participant_ids)
      AND other_p.user_id != p_user_id
    GROUP BY 1
  ),
  -- Follow network
  network AS (
    SELECT following_id AS uid FROM user_follows WHERE follower_id = p_user_id
    UNION
    SELECT follower_id AS uid FROM user_follows WHERE following_id = p_user_id
  ),
  scored AS (
    SELECT
      p.user_id AS uid,
      p.display_name,
      p.avatar_url,
      p.username,
      (COALESCE(dp.msg_count, 0) * 3 
       + CASE WHEN n.uid IS NOT NULL THEN 5 ELSE 0 END)
      * CASE 
        WHEN dp.last_msg > now() - interval '7 days' THEN 2.0
        WHEN dp.last_msg > now() - interval '30 days' THEN 1.5
        ELSE 1.0
      END AS total_score
    FROM profiles p
    LEFT JOIN dm_partners dp ON dp.uid = p.user_id
    LEFT JOIN network n ON n.uid = p.user_id
    WHERE p.user_id != p_user_id
      AND p.username IS NOT NULL
      AND (dp.uid IS NOT NULL OR n.uid IS NOT NULL OR v_query != '')
      AND (v_query = '' OR p.username ILIKE '%' || v_query || '%' OR p.display_name ILIKE '%' || v_query || '%')
  )
  SELECT s.uid, s.display_name, s.avatar_url, s.username, s.total_score
  FROM scored s
  ORDER BY
    CASE WHEN v_query != '' AND s.username ILIKE v_query || '%' THEN 0 ELSE 1 END,
    s.total_score DESC,
    s.username ASC
  LIMIT p_limit;
END;
$$;
