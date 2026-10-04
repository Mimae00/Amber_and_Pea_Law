package com.amberpea.law.admin;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.amberpea.law.common.NotFoundException;
import com.amberpea.law.common.PageResponse;
import com.amberpea.law.lead.Lead;
import com.amberpea.law.lead.LeadDtos.LeadSummary;
import com.amberpea.law.lead.LeadDtos.StatusUpdate;
import com.amberpea.law.lead.LeadRepository;
import com.amberpea.law.lead.LeadSource;
import com.amberpea.law.lead.LeadStatus;

import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

@RestController
@Validated
@RequestMapping("/api/admin/leads")
public class AdminLeadController {

    private final LeadRepository leads;

    public AdminLeadController(LeadRepository leads) {
        this.leads = leads;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<LeadSummary> list(
            @RequestParam(required = false) LeadStatus status,
            @RequestParam(required = false) LeadSource source,
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("id").descending()));
        return PageResponse.of(leads.findAll(filter(status, source, q), pageable), LeadSummary::from);
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public LeadSummary updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdate body) {
        Lead lead = leads.findById(id).orElseThrow(() -> new NotFoundException("Lead not found"));
        lead.setStatus(body.status());
        return LeadSummary.from(leads.saveAndFlush(lead));
    }

    /** Criteria API with bound parameters; the search term is never concatenated into SQL. */
    static Specification<Lead> filter(LeadStatus status, LeadSource source, String q) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            if (source != null) {
                p.add(cb.equal(root.get("source"), source));
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + escapeLike(q.trim().toLowerCase()) + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), like, '\\'),
                        cb.like(cb.lower(root.get("email")), like, '\\'),
                        cb.like(cb.lower(cb.coalesce(root.get("phone"), "")), like, '\\')));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }

    static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
