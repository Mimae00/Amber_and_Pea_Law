package com.amberpea.law.lead;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.amberpea.law.practicearea.PracticeArea;
import com.amberpea.law.practicearea.PracticeAreaRepository;

@Service
public class LeadService {

    private static final Logger log = LoggerFactory.getLogger(LeadService.class);

    private final LeadRepository leads;
    private final PracticeAreaRepository practiceAreas;

    public LeadService(LeadRepository leads, PracticeAreaRepository practiceAreas) {
        this.leads = leads;
        this.practiceAreas = practiceAreas;
    }

    /** Saves a lead. Returns false (and saves nothing) when the honeypot is filled. */
    @Transactional
    public boolean capture(CreateLeadRequest req) {
        if (req.isHoneypotFilled()) {
            log.info("Discarded lead submission: honeypot filled (source={})", req.source());
            return false;
        }
        Lead lead = new Lead(req.fullName().trim(), req.email().trim().toLowerCase(), blankToNull(req.phone()),
                blankToNull(req.message()), resolvePracticeArea(req.practiceAreaSlug()), req.source(), req.consent());
        leads.save(lead);
        log.info("Captured lead id={} source={}", lead.getId(), lead.getSource());
        return true;
    }

    PracticeArea resolvePracticeArea(String slug) {
        if (slug == null || slug.isBlank()) {
            return null;
        }
        return practiceAreas.findBySlugAndActiveTrue(slug.trim()).orElse(null);
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
