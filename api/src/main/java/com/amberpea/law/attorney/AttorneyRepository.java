package com.amberpea.law.attorney;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttorneyRepository extends JpaRepository<Attorney, Long> {

    @EntityGraph(attributePaths = "practiceAreas")
    List<Attorney> findByActiveTrueOrderBySortOrderAscFullNameAsc();

    @EntityGraph(attributePaths = "practiceAreas")
    Optional<Attorney> findBySlugAndActiveTrue(String slug);
}
