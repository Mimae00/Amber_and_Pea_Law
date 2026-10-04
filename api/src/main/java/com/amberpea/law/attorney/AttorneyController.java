package com.amberpea.law.attorney;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.amberpea.law.common.NotFoundException;

@RestController
@RequestMapping("/api/attorneys")
public class AttorneyController {

    private final AttorneyRepository repository;

    public AttorneyController(AttorneyRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<AttorneyDto> list() {
        return repository.findByActiveTrueOrderBySortOrderAscFullNameAsc().stream().map(AttorneyDto::from).toList();
    }

    @GetMapping("/{slug}")
    @Transactional(readOnly = true)
    public AttorneyDto get(@PathVariable String slug) {
        return repository.findBySlugAndActiveTrue(slug)
                .map(AttorneyDto::from)
                .orElseThrow(() -> new NotFoundException("Attorney not found"));
    }
}
