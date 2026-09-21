package com.internship.backend.service;

import com.internship.backend.dto.StatsResponse;
import com.internship.backend.entity.RiskRecord;
import com.internship.backend.exception.ResourceNotFoundException;
import com.internship.backend.repository.RiskRecordRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RiskRecordService {

    private final RiskRecordRepository repository;
    private final EmailService emailService;

    public RiskRecordService(RiskRecordRepository repository,
                             EmailService emailService) {
        this.repository = repository;
        this.emailService = emailService;
    }

    @CacheEvict(value = {"riskRecords", "riskRecord"}, allEntries = true)
    public RiskRecord saveRecord(RiskRecord riskRecord) {
        validate(riskRecord);
        RiskRecord saved = repository.save(riskRecord);
        new Thread(() -> {
            try { emailService.sendCreateNotification(saved); }
            catch (Exception e) { System.out.println("Email skipped: " + e.getMessage()); }
        }).start();
        return saved;
    }

    @CacheEvict(value = {"riskRecords", "riskRecord"}, allEntries = true)
    public RiskRecord updateRecord(Long id, RiskRecord incoming) {
        RiskRecord existing = getRecordById(id);
        existing.setTitle(incoming.getTitle());
        existing.setDescription(incoming.getDescription());
        existing.setCategory(incoming.getCategory());
        existing.setStatus(incoming.getStatus());
        existing.setRiskScore(incoming.getRiskScore());
        existing.setOwner(incoming.getOwner());
        existing.setDueDate(incoming.getDueDate());
        existing.setMitigationPlan(incoming.getMitigationPlan());
        return repository.save(existing);
    }

    @Cacheable("riskRecords")
    public Page<RiskRecord> getAllRecords(int page, int size, String sortBy, String sortDir) {
        if ("createdDate".equalsIgnoreCase(sortBy)) {
            sortBy = "createdAt";
        } else if ("score".equalsIgnoreCase(sortBy)) {
            sortBy = "riskScore";
        }
        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        return repository.findByDeletedFalse(PageRequest.of(page, size, sort));
    }

    @Cacheable(value = "riskRecord", key = "#id")
    public RiskRecord getRecordById(Long id) {
        return repository.findById(id)
                .filter(r -> !Boolean.TRUE.equals(r.getDeleted()))
                .orElseThrow(() ->
                        new ResourceNotFoundException("Risk record not found: " + id));
    }

    public Page<RiskRecord> search(String keyword, int page, int size) {
        return repository.searchByKeyword(keyword, PageRequest.of(page, size));
    }

    public List<RiskRecord> getAllForExport() {
        return repository.findByDeletedFalseOrderByCreatedAtDesc();
    }

    @CacheEvict(value = {"riskRecords", "riskRecord"}, allEntries = true)
    public void deleteRecord(Long id) {
        RiskRecord record = getRecordById(id);
        record.setDeleted(true);
        repository.save(record);
    }

    public StatsResponse getStats() {
        List<RiskRecord> all = repository.findByDeletedFalse();
        long total = all.size();
        long open = all.stream().filter(r -> "OPEN".equalsIgnoreCase(r.getStatus())).count();
        long mitigated = all.stream().filter(r -> "MITIGATED".equalsIgnoreCase(r.getStatus()) || "IN_PROGRESS".equalsIgnoreCase(r.getStatus())).count();
        long closed = all.stream().filter(r -> "CLOSED".equalsIgnoreCase(r.getStatus())).count();
        long high = all.stream().filter(r -> r.getRiskScore() != null && r.getRiskScore() >= 70).count();
        long med = all.stream().filter(r -> r.getRiskScore() != null && r.getRiskScore() >= 40 && r.getRiskScore() < 70).count();
        long low = all.stream().filter(r -> r.getRiskScore() == null || r.getRiskScore() < 40).count();

        Map<String, Long> categoryMap = all.stream()
                .filter(r -> r.getCategory() != null && !r.getCategory().isBlank())
                .collect(Collectors.groupingBy(RiskRecord::getCategory, Collectors.counting()));

        List<StatsResponse.CategoryCount> byCategory = categoryMap.entrySet().stream()
                .map(e -> new StatsResponse.CategoryCount(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        List<StatsResponse.CategoryCount> byStatus = List.of(
                new StatsResponse.CategoryCount("OPEN", open),
                new StatsResponse.CategoryCount("MITIGATED", mitigated),
                new StatsResponse.CategoryCount("CLOSED", closed)
        );

        List<StatsResponse.CategoryCount> bySeverity = List.of(
                new StatsResponse.CategoryCount("HIGH", high),
                new StatsResponse.CategoryCount("MEDIUM", med),
                new StatsResponse.CategoryCount("LOW", low)
        );

        return StatsResponse.builder()
                .total(total)
                .totalRisks(total)
                .openCount(open)
                .openRisks(open)
                .inProgressCount(mitigated)
                .closedCount(closed)
                .mitigated(mitigated + closed)
                .averageRiskScore(repository.averageRiskScore())
                .highRiskCount(high)
                .highSeverity(high)
                .byCategory(byCategory)
                .byStatus(byStatus)
                .bySeverity(bySeverity)
                .build();
    }

    public List<RiskRecord> getByStatus(String status) {
        return repository.findByStatusAndDeletedFalse(status);
    }

    public List<RiskRecord> getByCategory(String category) {
        return repository.findByCategoryAndDeletedFalse(category);
    }

    private void validate(RiskRecord r) {
        if (r.getTitle() == null || r.getTitle().isBlank())
            throw new IllegalArgumentException("Title is required");
        if (r.getCategory() == null || r.getCategory().isBlank())
            throw new IllegalArgumentException("Category is required");
        if (r.getStatus() == null || r.getStatus().isBlank())
            throw new IllegalArgumentException("Status is required");
    }
}