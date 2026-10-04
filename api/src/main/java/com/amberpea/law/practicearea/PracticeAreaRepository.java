package com.amberpea.law.practicearea;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PracticeAreaRepository extends JpaRepository<PracticeArea, Long> {

    List<PracticeArea> findByActiveTrueOrderBySortOrderAscNameAsc();

    List<PracticeArea> findAllByOrderBySortOrderAscNameAsc();

    Optional<PracticeArea> findBySlugAndActiveTrue(String slug);

    Optional<PracticeArea> findBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    boolean existsBySlug(String slug);
}
