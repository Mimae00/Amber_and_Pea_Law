package com.amberpea.law.practicearea;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.amberpea.law.common.NotFoundException;

@RestController
@RequestMapping("/api/practice-areas")
public class PracticeAreaController {

    private final PracticeAreaRepository repository;

    public PracticeAreaController(PracticeAreaRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<PracticeAreaDto> list() {
        return repository.findByActiveTrueOrderBySortOrderAscNameAsc().stream().map(PracticeAreaDto::from).toList();
    }

    @GetMapping("/{slug}")
    @Transactional(readOnly = true)
    public PracticeAreaDto get(@PathVariable String slug) {
        return repository.findBySlugAndActiveTrue(slug)
                .map(PracticeAreaDto::from)
                .orElseThrow(() -> new NotFoundException("Practice area not found"));
    }
}
